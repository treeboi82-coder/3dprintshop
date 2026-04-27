import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileUp, UploadCloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const allowedExtensions = [".stl", ".obj", ".3mf", ".step", ".stp"];

const formatSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

const Upload = () => {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [details, setDetails] = useState("");
  const [isSending, setIsSending] = useState(false);

  const fileDetails = useMemo(() => {
    if (!selectedFile) return null;
    const extension = selectedFile.name.includes(".")
      ? `.${selectedFile.name.split(".").pop()?.toLowerCase()}`
      : "unknown";

    return {
      name: selectedFile.name,
      extension,
      size: formatSize(selectedFile.size),
    };
  }, [selectedFile]);

  const readFileAsBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("Could not read file."));
          return;
        }

        const base64 = result.split(",")[1];
        if (!base64) {
          reject(new Error("Invalid file encoding."));
          return;
        }
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Choose a 3D file before sending.",
      });
      return;
    }

    if (!clientName.trim() || !clientEmail.trim()) {
      toast({
        title: "Missing info",
        description: "Please add your name and email.",
      });
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10 MB.",
      });
      return;
    }

    setIsSending(true);
    try {
      const fileBase64 = await readFileAsBase64(selectedFile);
      const { error } = await supabase.functions.invoke("send-upload-email", {
        body: {
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim(),
          details: details.trim(),
          fileName: selectedFile.name,
          mimeType: selectedFile.type || "application/octet-stream",
          fileBase64,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Upload sent",
        description: "Your file was emailed successfully.",
      });

      setSelectedFile(null);
      setClientName("");
      setClientEmail("");
      setDetails("");
    } catch (error) {
      toast({
        title: "Send failed",
        description: error instanceof Error ? error.message : "Could not send your file.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-dvh bg-secondary p-2 md:p-6 text-ink">
      <div className="bg-panel border border-line shadow-panel min-h-[calc(100dvh-1rem)] md:min-h-[calc(100dvh-3rem)]">
        <header className="flex items-center justify-between border-b border-line px-4 md:px-6 py-4 text-xs font-mono uppercase tracking-wider">
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm tracking-widest">3D PRINT SHOP</span>
            <span className="hidden sm:inline px-2 py-0.5 bg-panel-muted border border-line-soft">
              Upload Center
            </span>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-ink-muted hover:text-ink transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Home
          </Link>
        </header>

        <main className="px-6 lg:px-16 py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-3">
              Fast Upload
            </p>
            <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight mb-4">
              Upload Your 3D File
            </h1>
            <p className="text-ink-muted font-mono max-w-[60ch] mb-8">
              Drop your design file here or choose it manually. We support the most common
              manufacturing formats and will review printability before quoting.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <label
                htmlFor="model-upload"
                className="group block border border-dashed border-line bg-panel-muted hover:bg-panel transition-colors p-8 md:p-10 cursor-pointer"
              >
                <div className="flex flex-col items-center text-center">
                  <UploadCloud className="size-10 text-accent mb-4" />
                  <span className="font-mono text-sm uppercase tracking-widest text-ink">
                    Drag and drop your file
                  </span>
                  <span className="font-mono text-xs text-ink-muted mt-2">
                    or click to browse from your device
                  </span>
                </div>
                <input
                  id="model-upload"
                  type="file"
                  className="sr-only"
                  accept={allowedExtensions.join(",")}
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-2 font-mono text-xs uppercase tracking-widest text-ink-muted">
                  Name
                  <input
                    type="text"
                    value={clientName}
                    onChange={(event) => setClientName(event.target.value)}
                    className="px-4 py-3 border border-line bg-panel text-ink normal-case tracking-normal text-sm"
                    placeholder="Your name"
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 font-mono text-xs uppercase tracking-widest text-ink-muted">
                  Email
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(event) => setClientEmail(event.target.value)}
                    className="px-4 py-3 border border-line bg-panel text-ink normal-case tracking-normal text-sm"
                    placeholder="name@email.com"
                    required
                  />
                </label>
              </div>

              <label className="flex flex-col gap-2 font-mono text-xs uppercase tracking-widest text-ink-muted">
                Print Details (Optional)
                <textarea
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  className="px-4 py-3 border border-line bg-panel text-ink normal-case tracking-normal text-sm min-h-24"
                  placeholder="Material, color, quantity, deadline..."
                />
              </label>

              <div className="mt-2 font-mono text-xs text-ink-muted">
                Supported formats: {allowedExtensions.join(", ")} (max 10 MB)
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="w-full md:w-auto bg-ink text-panel px-6 py-3 font-mono text-sm uppercase tracking-widest hover:bg-accent transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSending ? "Sending..." : "Send File by Email"}
              </button>
            </form>
          </section>

          <aside className="lg:col-span-5 border border-line bg-panel-muted p-6 md:p-8">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-3">
              Upload Status
            </h2>
            {!fileDetails ? (
              <div className="border border-line-soft p-6 bg-panel text-ink-muted font-mono text-sm">
                No file selected yet.
              </div>
            ) : (
              <div className="border border-line-soft p-6 bg-panel">
                <div className="flex items-center gap-3 mb-4">
                  <FileUp className="size-5 text-accent" />
                  <p className="font-semibold tracking-tight text-lg">{fileDetails.name}</p>
                </div>
                <dl className="font-mono text-sm space-y-3">
                  <div className="flex justify-between border-t border-line-soft pt-3">
                    <dt className="text-ink-muted uppercase">Type</dt>
                    <dd>{fileDetails.extension}</dd>
                  </div>
                  <div className="flex justify-between border-t border-line-soft pt-3">
                    <dt className="text-ink-muted uppercase">Size</dt>
                    <dd>{fileDetails.size}</dd>
                  </div>
                </dl>
                <p className="font-mono text-xs text-ink-muted mt-5">
                  Next step: share print details (material, infill, quantity) by phone or in-store.
                </p>
              </div>
            )}
          </aside>
        </main>
      </div>
    </div>
  );
};

export default Upload;
