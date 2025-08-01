import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const FILEBASE_API_KEY = import.meta.env.VITE_FILEBASE_API_KEY || "";
const IPFS_ADD_URL = "https://rpc.filebase.io/api/v0/add";
const IPFS_DELETE_URL = "https://rpc.filebase.io/api/v0/rm";
const IPFS_GATEWAY =
  import.meta.env.VITE_IPFS_GATEWAY ||
  "https://wily-sapphire-octopus.myfilebase.com/ipfs";

interface IPFSResponse {
  Name: string;
  Hash: string;
  Size: string;
}

export interface IPFSResult {
  cid: string;
  name: string;
  url: string;
  sessionId: string;
}

export async function uploadToIPFS(
  formData: FormData,
  fileType: "image" | "metadata",
): Promise<IPFSResult> {
  const sessionId = uuidv4();

  try {
    const response = await axios.post<IPFSResponse>(IPFS_ADD_URL, formData, {
      headers: {
        Authorization: `Bearer ${FILEBASE_API_KEY}`,
      },
    });

    const cid = response.data.Hash;
    const url = `${IPFS_GATEWAY}/${cid}`;

    console.log(`✅ ${fileType} uploaded: ${response.data.Name}`);
    console.log(`CID: ${cid}`);
    console.log(`URL: ${url}`);

    return {
      cid,
      name: response.data.Name,
      url,
      sessionId,
    };
  } catch (error: any) {
    console.error(
      `❌ Error uploading ${fileType}:`,
      error.response?.data || error.message,
    );
    throw new Error(
      `Failed to upload ${fileType} to IPFS: ${error.response?.data?.Message || error.message}`,
    );
  }
}

export async function cleanupIPFSFiles(
  imageCid?: string,
  metadataCid?: string,
): Promise<void> {
  const cleanup = async (cid: string) => {
    try {
      await axios.post(
        `${IPFS_DELETE_URL}?arg=${cid}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${FILEBASE_API_KEY}`,
          },
        },
      );
      console.log(`✅ Cleaned up IPFS file: ${cid}`);
    } catch (error: any) {
      console.error(
        `❌ Failed to cleanup IPFS file ${cid}:`,
        error.response?.data || error.message,
      );
      // Don't throw error for cleanup failures
    }
  };

  const promises = [];
  if (imageCid) promises.push(cleanup(imageCid));
  if (metadataCid) promises.push(cleanup(metadataCid));

  await Promise.all(promises);
}

export function generateMetadata(
  title: string,
  description: string,
  mediaUrl: string,
): any {
  return {
    title,
    description,
    media: mediaUrl
  };
}
