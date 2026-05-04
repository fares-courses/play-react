# 19 — File uploads

## What you're learning & why it matters

You're learning the patterns for letting users upload files from a React app: file pickers, drag-and-drop targets, multipart upload, direct-to-S3 uploads, progress bars, image previews, and how this maps to Rails' ActiveStorage when that's your backend.

File uploads are deceptively complex: the file picker UX, the upload protocol, error/retry, large-file handling, and progress reporting are all separate concerns. Get the components right and the rest is mostly plumbing.

### Terms first

- **File / Blob**: browser objects representing file contents in memory. `File` is a `Blob` with a name and metadata.
- **FormData**: a browser API for building multipart/form-data request bodies (the standard format for file uploads).
- **Multipart upload**: a single HTTP request containing files plus other form fields. The classic upload format.
- **Direct upload**: client uploads straight to cloud storage (S3) using a pre-signed URL — server never proxies the bytes.
- **Pre-signed URL**: a temporary URL (signed by the server) that grants permission to upload to a specific path in cloud storage, without exposing your secret keys.
- **ActiveStorage**: Rails' built-in attachment system; supports both server-proxied and direct uploads.
- **Object URL**: a `blob:` URL the browser can use to display a `File`/`Blob` (e.g., for image previews) without uploading it.

## Mental model

> **There are two upload paths: server-proxied (file goes to your server, which handles it) and direct-to-cloud (file goes straight to S3 with a pre-signed URL). Pick based on file size and where storage lives. The React UI is the same shape either way: pick → preview → upload → progress → done/error.**

For small files (< a few MB) and most internal apps, server-proxied is simpler. For large files or when your server is on small instances, direct-to-cloud is much better — your server doesn't waste CPU/RAM on file bytes.

## The file picker

The lowest-level building block — a native `<input type="file">`:

```tsx
<input
  type="file"
  accept="image/*"
  multiple
  onChange={(e) => {
    const files = Array.from(e.target.files ?? []);
    handleFiles(files);
  }}
/>
```

`e.target.files` is a `FileList` — array-like but not an array. `Array.from(...)` converts it. `accept="image/*"` filters the picker; `multiple` allows selecting many.

The native picker is ugly. Hide it and trigger via a styled button:

```tsx
const inputRef = useRef<HTMLInputElement>(null);

return (
  <>
    <button onClick={() => inputRef.current?.click()}>Choose files</button>
    <input ref={inputRef} type="file" hidden onChange={...} />
  </>
);
```

## Drag-and-drop target

A simple drop zone:

```tsx
function Dropzone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        onFiles(Array.from(e.dataTransfer.files));
      }}
      style={{ border: "2px dashed", background: isOver ? "#eef" : "transparent", padding: 40 }}
    >
      Drop files here
    </div>
  );
}
```

Two crucial details:
- `e.preventDefault()` on `onDragOver` is required — otherwise the browser's default behavior (open the file in the tab) wins.
- `e.dataTransfer.files` is where dropped files live, not `e.target.files`.

For richer UX, use **react-dropzone** (`npm install react-dropzone`) — same idea but handles file-type filtering, validation messages, paste-from-clipboard, click-to-pick, etc.

## Image previews

Show the user the file before upload:

```tsx
function ImagePreview({ file }: { file: File }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <img src={url} alt={file.name} style={{ maxWidth: 200 }} />;
}
```

`URL.createObjectURL(blob)` creates a `blob:...` URL referencing the file in memory. **Always `revokeObjectURL` in cleanup** — otherwise you leak memory until the page unloads.

## Server-proxied multipart upload

```tsx
async function uploadFile(file: File, onProgress: (pct: number) => void) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("description", "uploaded from app");

  return new Promise<{ id: string; url: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/uploads");
    xhr.setRequestHeader("Authorization", `Bearer ${getToken()}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
      else reject(new Error(`Upload failed: ${xhr.status}`));
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}
```

Why XHR instead of `fetch`? **`fetch` doesn't support upload progress events.** XHR is the only way (in stable browsers) to get a progress bar for an upload. Annoying, but it's the situation.

Use it from a React component:

```tsx
function UploadButton({ file }: { file: File }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");

  async function start() {
    setStatus("uploading");
    try {
      await uploadFile(file, setProgress);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      <button onClick={start} disabled={status === "uploading"}>Upload</button>
      {status === "uploading" && <progress value={progress} max={100} />}
      {status === "done" && <span>Done</span>}
      {status === "error" && <span>Failed</span>}
    </div>
  );
}
```

## Direct-to-S3 upload (pre-signed URL)

Three steps:

1. **Client asks server**: "I want to upload a file with these properties." Server returns `{ uploadUrl, fields, finalKey }`.
2. **Client PUTs/POSTs the file** to `uploadUrl` (S3, GCS, R2). No server involvement.
3. **Client tells server**: "Done — here's the key." Server records the attachment.

Why: your Node/Rails server never handles file bytes. Better for big files, lower server cost.

```tsx
async function directUpload(file: File, onProgress: (p: number) => void) {
  // Step 1
  const presign = await api.post<{ uploadUrl: string; fields: Record<string, string>; key: string }>(
    "/uploads/presign",
    { filename: file.name, contentType: file.type, size: file.size }
  );

  // Step 2
  const formData = new FormData();
  for (const [k, v] of Object.entries(presign.fields)) formData.append(k, v);
  formData.append("file", file);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", presign.uploadUrl);
    xhr.upload.onprogress = (e) => onProgress((e.loaded / e.total) * 100);
    xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error("S3 upload failed"));
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });

  // Step 3
  return api.post<{ id: string; url: string }>("/uploads/finalize", { key: presign.key });
}
```

The `/uploads/presign` endpoint on your server uses the AWS SDK to generate the URL. Don't put your AWS keys in the React app. Ever.

## ActiveStorage direct uploads

Rails ActiveStorage has built-in support for direct uploads with a JS client:

```bash
npm install @rails/activestorage
```

```ts
import { DirectUpload } from "@rails/activestorage";

function uploadToActiveStorage(file: File, onProgress: (p: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const upload = new DirectUpload(file, "/rails/active_storage/direct_uploads", {
      directUploadWillStoreFileWithXHR(xhr) {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
        });
      },
    });
    upload.create((err, blob) => err ? reject(err) : resolve(blob.signed_id));
  });
}
```

Then send `signed_id` as the value of an attachment field in your normal form submit. ActiveStorage figures out the rest.

CORS must be configured on your S3 bucket (or whatever ActiveStorage's storage backend is) to accept uploads from your SPA's origin.

## Validation: client-side, then server-side

Always validate both. Client-side validation is for UX; server-side is for security.

```tsx
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

function validate(file: File): string | null {
  if (file.size > MAX_SIZE) return `File is too big (max 5MB)`;
  if (!ALLOWED.includes(file.type)) return `Type not allowed`;
  return null;
}
```

For images, you can also check dimensions:
```ts
async function getDimensions(file: File): Promise<{w: number; h: number}> {
  const img = new Image();
  img.src = URL.createObjectURL(file);
  await img.decode();
  URL.revokeObjectURL(img.src);
  return { w: img.naturalWidth, h: img.naturalHeight };
}
```

## How to use this doc with an agent

**1. Build the lesson:**
```
In src/lessons/19-file-uploads/, build:

1. A Dropzone component that accepts drag-drop AND click-to-pick.
   Multiple files. accept="image/*". Validates size <5MB, type JPEG/PNG.
   Show errors per-file inline.

2. ImagePreview list: each accepted file shows a thumbnail using
   createObjectURL, with proper revoke in cleanup.

3. UploadList: each file shows a progress bar, status (idle/uploading/done/error),
   and a Remove button. Use mock upload (XHR against a fake endpoint that
   responds after a delay; simulate progress events; 20% chance of error).

4. A "retry" button on errored items.

Use TypeScript strictly. Don't use react-dropzone — write the dropzone
ourselves so we feel the API. Comment the createObjectURL/revoke pair
prominently so I see the cleanup pattern.
```

**2. Direct-upload exercise:**
```
Add a second variant of the upload that uses the pre-signed URL pattern:
1. Mock a /api/presign endpoint that returns {uploadUrl, fields, key}
   pointing back to a mock /api/fake-s3 endpoint
2. Mock /api/fake-s3 accepting the multipart form, returning 204
3. Mock /api/finalize accepting {key}, returning {id, url}
The React side should orchestrate the three-step flow with progress and
error handling. Compare side-by-side with the server-proxied version.
```

**3. ActiveStorage adapter:**
```
Imagine my Rails backend uses ActiveStorage with S3 in production. Write
the React-side helper using @rails/activestorage's DirectUpload. Then
write a small UploadField component that:
- Accepts a file
- Uploads via DirectUpload
- Stores the resulting signed_id in a hidden form field
- Shows progress
The form submit (hooked to react-hook-form, doc 12) sends signed_id along
with other fields.
```

## Checkpoints

1. Why use XHR instead of fetch for uploads?
2. What does `URL.createObjectURL` do, and why must you `revokeObjectURL`?
3. What's the difference between server-proxied and direct-to-cloud uploads, and when does each fit?
4. Why is client-side validation alone not enough?
5. What does `e.preventDefault()` in `onDragOver` prevent?
6. In the pre-signed URL flow, what does the server need to do that the client can't?

## Footguns

- **Forgetting `e.preventDefault()` on drag handlers.** Browser opens the file instead of dropping it.
- **Leaking object URLs.** Memory grows until refresh. `revokeObjectURL` in cleanup.
- **Trusting client-side validation.** Server must re-validate (size, type, malicious files).
- **CORS misconfigured on S3.** Direct upload PUTs fail. Allow `POST`/`PUT` from your SPA origin and expose the right headers.
- **Sending AWS keys to the client.** Catastrophic security failure. Use pre-signed URLs from the server.
- **Uploading huge files in one request.** Connection drops kill the upload. For large files use multipart upload (S3 supports it; libraries like `@aws-sdk/lib-storage` handle chunking).
- **Blocking the UI during upload.** XHR is async; let the user keep working. Just disable the form / show progress.
- **Showing a generic "Uploading…" without progress.** Annoying for big files. Always progress when feasible.
- **Re-uploading on every retry without resume.** For big files, ideally resume from where you left off. For small files, full re-upload is fine.

## Ask-the-agent cheatsheet

- *"Build me a complete file-upload UI: Dropzone + previews + per-file progress + retry. Use XHR for progress. Validate size/type. Mock the backend."*
- *"Convert my server-proxied upload to a pre-signed URL flow. Add the /presign endpoint shape and the finalize step. Walk me through the security boundary."*
- *"Wire up @rails/activestorage's DirectUpload to my form. The submitted signed_id should be sent as part of a react-hook-form submit."*
- *"Add image dimension validation and EXIF stripping (for privacy) before upload. Use a Canvas-based approach client-side."*
- *"My uploads are slow because the server proxies them. Switch to direct-to-S3, list the server changes I need to make and the React changes."*

## Where this goes next

- **Doc 21** — Drag-and-drop more generally (sortable lists, kanban). The dropzone here is a special case.
- **Doc 22** — Animations, often paired with file lists for nice add/remove transitions.
