import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "./index";

export type UploadParams = {
  key: string;
  buffer: Buffer;
  contentType: string;
};

/**
 * Upload a buffer to Cloudflare R2 and return its public URL.
 * Key should be unique per asset, e.g. "outputs/<sessionId>/result.png"
 */
export async function uploadToR2(params: UploadParams): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: params.key,
      Body: params.buffer,
      ContentType: params.contentType,
    })
  );

  return `${R2_PUBLIC_URL}/${params.key}`;
}
