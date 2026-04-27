import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type UploadPayload = {
  clientName?: string;
  clientEmail?: string;
  details?: string;
  fileName?: string;
  mimeType?: string;
  fileBase64?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const toEmail = Deno.env.get("UPLOAD_RECEIVER_EMAIL");
    const fromEmail = Deno.env.get("UPLOAD_FROM_EMAIL") ?? "Print Shop <onboarding@resend.dev>";

    if (!resendApiKey || !toEmail) {
      return new Response(
        JSON.stringify({ error: "Email service not configured on server." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = (await req.json()) as UploadPayload;
    const { clientName, clientEmail, details, fileName, mimeType, fileBase64 } = body;

    if (!clientName || !clientEmail || !fileName || !fileBase64) {
      return new Response(JSON.stringify({ error: "Missing required fields." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: clientEmail,
        subject: `New 3D file upload from ${clientName}`,
        html: `
          <h2>New 3D Upload Request</h2>
          <p><strong>Name:</strong> ${clientName}</p>
          <p><strong>Email:</strong> ${clientEmail}</p>
          <p><strong>File:</strong> ${fileName}</p>
          <p><strong>Notes:</strong> ${details || "No notes provided."}</p>
        `,
        attachments: [
          {
            filename: fileName,
            content: fileBase64,
            type: mimeType || "application/octet-stream",
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: errorText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unexpected server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
