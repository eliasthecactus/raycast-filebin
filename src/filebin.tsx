import {
  ActionPanel,
  List,
  Action,
  Icon,
  LocalStorage,
  Form,
  useNavigation,
  showToast,
  Toast,
  popToRoot,
} from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import path from "path";
import fs from "fs";
import mime from "mime-types";
import os from "os";
import { Readable } from "stream";
import { finished } from "stream/promises";

function generateRandomString(length: number): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

async function saveBinName(binName: string) {
  const storedBins = await getStoredBins();
  if (!storedBins.includes(binName)) {
    storedBins.push(binName);
    await LocalStorage.setItem("bins", JSON.stringify(storedBins));
  }
}

async function downloadArchiveFile(type: string, binName: string) {
  try {
    const downloadsPath = path.join(os.homedir(), "Downloads");
    const downloadPath = await downloadFile(
      `https://filebin.net/archive/${binName}/${type}`,
      `${binName}-archive.${type}`,
      downloadsPath,
    );
    showToast(Toast.Style.Success, "Archive downloaded successfully", `File saved at ${downloadPath}`);
  } catch (error: unknown) {
    showToast(Toast.Style.Failure, "Download failed", error.message);
  }
}

async function downloadFile(url: string, name: string, location: string) {
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      Cookie: "verified=2024-05-24",
    },
  });

  if (!response.ok) {
    throw new Error(`Error downloading file: ${response.statusText}`);
  }

  // Check if response.body is null
  if (!response.body) {
    throw new Error("No body in the response");
  }

  // Ensure the location directory exists
  if (!fs.existsSync(location)) {
    fs.mkdirSync(location, { recursive: true });
  }

  const destination = path.join(location, name);
  const fileStream = fs.createWriteStream(destination);

  const nodeReadableStream = Readable.from(response.body as NodeJS.ReadableStream);

  try {
    await finished(nodeReadableStream.pipe(fileStream));
    console.log(`File saved at ${destination}`);
  } catch (err: unknown) {
    console.error(`Error saving file: ${err.message}`);
  }

  console.log(`File saved at ${destination}`);
  return destination;
}

async function deleteFile(binName: string, fileName: string) {
  const response = await fetch(`https://filebin.net/${binName}/${fileName}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`Error deleting file: ${response.statusText}. Details: ${errorDetails}`);
  }
  return await response.text();
}

async function removeBin(binName: string) {
  const storedBins = await getStoredBins();
  const updatedBins = storedBins.filter((bin) => bin !== binName);
  await LocalStorage.setItem("bins", JSON.stringify(updatedBins));
}

async function deleteBin(binName: string) {
  const response = await fetch(`https://filebin.net/${binName}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`Error deleting bin: ${response.statusText}. Details: ${errorDetails}`);
  }
  removeBin(binName);
  return await response.text();
}

async function lockBin(binName: string) {
  const response = await fetch(`https://filebin.net/${binName}`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`Error locking bin: ${response.statusText}. Details: ${errorDetails}`);
  }
  return await response.text();
}

async function getStoredBins(): Promise<string[]> {
  const bins = await LocalStorage.getItem<string>("bins");
  return bins ? JSON.parse(bins) : [];
}

function fileActions(binName: string, fileName: string) {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Bin Actions">
        <Action
          title="Download File"
          icon={Icon.Download}
          onAction={async () => {
            const downloadsPath = path.join(os.homedir(), "Downloads");
            await downloadFile(`https://filebin.net/${binName}/${fileName}`, fileName, downloadsPath);
            showToast(Toast.Style.Success, "File downloaded successfully");
          }}
        />
        <Action
          title="Delete File"
          icon={Icon.Trash}
          onAction={async () => {
            await deleteFile(binName, fileName);
            showToast(Toast.Style.Success, "File deleted successfully");
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Filename to Clipboard" content={fileName} />
        <Action.CopyToClipboard
          title="Copy Download URL to Clipboard"
          content={`https://filebin.net/${binName}/${fileName}`}
        />
        <Action.OpenInBrowser title="Open in Browser" url={`https://filebin.net/${binName}/${fileName}`} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function BinActions(binName: string) {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Bin Actions">
        <Action.Push title="Open Bin" target={<BinView binName={binName} />} />
        <Action
          title="Remove Bin"
          icon={Icon.Minus}
          onAction={async () => {
            await removeBin(binName);
            showToast(Toast.Style.Success, "Bin removed successfully");
          }}
        />
        <Action
          title="Delete Bin"
          icon={Icon.Trash}
          onAction={async () => {
            await deleteBin(binName);
            showToast(Toast.Style.Success, "Bin deleted successfully");
          }}
        />

        <Action
          title="Lock Bin"
          icon={Icon.Lock}
          onAction={async () => {
            await lockBin(binName);
            showToast(Toast.Style.Success, "Bin removed successfully");
          }}
        />
        <Action
          title="Download Bin as Zip"
          icon={Icon.Download}
          onAction={async () => {
            await downloadArchiveFile("zip", binName);
            showToast(Toast.Style.Success, "Bin downloaded successfully");
          }}
        />
        <Action
          title="Download Bin as Tar Archive"
          icon={Icon.Download}
          onAction={async () => {
            await downloadArchiveFile("tar", binName);
            showToast(Toast.Style.Success, "Bin downloaded successfully");
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.OpenInBrowser url={`https://filebin.net/${binName}`} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function AddFileView({ binName }: { binName: string }) {
  async function uploadFiles(filePaths: string[], binName: string, baseFileName?: string) {
    if (!filePaths || filePaths.length === 0) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: "At least one file must be selected." });
      return;
    }

    for (const [index, filePath] of filePaths.entries()) {
      try {
        const originalExtension = path.extname(filePath); // Get the file extension
        const originalFileName = path.basename(filePath, originalExtension); // Get the file name without extension

        console.log(baseFileName);

        // Determine the new file name
        const newFileName = baseFileName
          ? `${baseFileName}${filePaths.length > 1 ? `_${index + 1}` : ""}${originalExtension}`
          : `${originalFileName}${originalExtension}`;

        console.log(newFileName);

        const encodedFileName = encodeURIComponent(newFileName); // URL-safe file name

        // Read file data
        const fileData = fs.readFileSync(filePath); // Synchronous file reading (can be replaced with async)

        // Make the fetch request
        const response = await fetch(`https://filebin.net/${binName}/${encodedFileName}`, {
          method: "POST",
          headers: {
            "Content-Type": mime.lookup(filePath) || "application/octet-stream",
          },
          body: fileData,
        });

        if (!response.ok) {
          const errorDetails = await response.text();
          throw new Error(`Error uploading file: ${response.statusText}. Details: ${errorDetails}`);
        }

        // Success message
        showToast({
          style: Toast.Style.Success,
          title: "File Uploaded",
          message: `File "${newFileName}" successfully uploaded to bin "${binName}"`,
        });
      } catch (error: unknown) {
        console.error("Upload error:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Upload Failed",
          message: `Failed to upload file: ${filePath}. ${error.message}`,
        });
      }
    }

    // Once all files are uploaded, go back to the root
    popToRoot();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={(values) => uploadFiles(values.files, binName, values.fileName)} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" title="Select Files" />
      <Form.TextField id="fileName" title="Base File Name" placeholder="Enter base file name (optional)" />
    </Form>
  );
}

function BinInfoView({ binData }: { binData: any }) {
  return (
    <List navigationTitle={`Bin Information: ${binData.bin.id}`}>
      <List.Item title="Bin ID" accessoryTitle={binData.bin.id} icon={Icon.BarCode} />
      <List.Item title="Readonly" accessoryTitle={binData.bin.readonly ? "Yes" : "No"} icon={Icon.Lock} />
      <List.Item title="Total Size" accessoryTitle={binData.bin.bytes_readable} icon={Icon.Download} />
      <List.Item title="Files Count" accessoryTitle={binData.bin.files.toString()} icon={Icon.Document} />
      <List.Item title="Updated At" accessoryTitle={binData.bin.updated_at_relative} icon={Icon.Clock} />
      <List.Item title="Created At" accessoryTitle={binData.bin.created_at_relative} icon={Icon.Calendar} />
      <List.Item title="Expires At" accessoryTitle={binData.bin.expired_at_relative} icon={Icon.Clock} />
    </List>
  );
}

function BinView({ binName }: { binName: string }) {
  const [files, setFiles] = useState<any[]>([]);
  const [binData, setBinData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBinContents() {
      try {
        const response = await fetch(`https://filebin.net/${binName}`, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) {
          throw new Error(`Error fetching bin: ${response.statusText}`);
        }
        const data: any = await response.json();

        const binFiles = data.files || [];
        setFiles(binFiles);
        setBinData(data); // Store the full bin data for the info view
        setErrorMessage(null);
      } catch (error) {
        console.error(error);
        setErrorMessage("Failed to load bin contents. The bin may not exist or may have expired.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchBinContents();
  }, [binName]);

  if (errorMessage) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="Error" description={errorMessage} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle={`Files in ${binName}`}>
      <List.Section title="Actions">
        {binData &&
          !binData.bin.readonly && ( // Only show "Add File" if bin is not locked
            <List.Item
              icon={Icon.Plus}
              title="Add File"
              actions={
                <ActionPanel>
                  <Action.Push title="Add File" target={<AddFileView binName={binData.bin.id} />} />
                </ActionPanel>
              }
            />
          )}

        {binData && (
          <List.Item
            key="bin-info"
            icon={Icon.Info}
            title="Show Bin Information"
            actions={
              <ActionPanel>
                <Action.Push title="Show Bin Info" target={<BinInfoView binData={binData} />} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      <List.Section title="Content">
        {files.length === 0 ? (
          <List.EmptyView
            icon={Icon.Tray}
            title="No files found"
            description={`The bin ${binName} is empty or does not exist.`}
          />
        ) : (
          files.map((file) => (
            <List.Item
              key={file.filename}
              icon={Icon.BlankDocument}
              title={file.filename}
              subtitle={file["content-type"]}
              accessories={[{ text: file.bytes_readable }]}
              actions={fileActions(binName, file.filename)}
            />
          ))
        )}
      </List.Section>
    </List>
  );
}

function AddBinView({ onBinAdded }: { onBinAdded: () => void }) {
  const { pop } = useNavigation();
  const [binName, setBinName] = useState<string>(generateRandomString(12));
  const [error, setError] = useState<string | undefined>();

  // Function to validate the bin name
  function validateBinName(name: string) {
    // Check if binName length is between 8 and 50 characters
    if (name.length < 8 || name.length > 50) {
      setError("Bin name must be between 8 and 50 characters.");
      return false;
    }

    // Check if binName contains only alphanumeric characters and is not just numbers
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    if (!alphanumericRegex.test(name) || /^\d+$/.test(name)) {
      setError("Bin name must contain only letters and numbers, and cannot be only numbers.");
      return false;
    }

    setError(undefined); // Clear the error if validation is successful
    return true;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Bin"
            onSubmit={async () => {
              if (validateBinName(binName)) {
                await saveBinName(binName);
                onBinAdded();
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="binName"
        title="Bin Name"
        placeholder="Enter a new bin name"
        value={binName}
        onChange={(newValue) => {
          setBinName(newValue);
          validateBinName(newValue);
        }}
        error={error}
      />
    </Form>
  );
}
export default function Command() {
  const [bins, setBins] = useState<string[]>([]);
  const [binDetails, setBinDetails] = useState<any>({});

  useEffect(() => {
    async function loadBins() {
      const storedBins = await getStoredBins();
      setBins(storedBins);

      // Fetch details for each bin to check if it is locked (readonly) and the creation date
      const details: any = {};
      for (const bin of storedBins) {
        const response = await fetch(`https://filebin.net/${bin}`, { headers: { Accept: "application/json" } });
        if (response.ok) {
          const data: any = await response.json();
          details[bin] = { readonly: data.bin.readonly, createdAt: data.bin.created_at_relative };
        }
      }
      setBinDetails(details);
    }
    loadBins();
  }, []);

  const handleBinAdded = async () => {
    const updatedBins = await getStoredBins();
    setBins(updatedBins);
  };

  return (
    <List isLoading={bins.length === 0}>
      <List.Section title="Actions">
        <List.Item
          icon={Icon.Plus}
          title="Add New Bin"
          actions={
            <ActionPanel>
              <Action.Push title="Add Bin" target={<AddBinView onBinAdded={handleBinAdded} />} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Bins">
        {bins.map((bin) => {
          const binInfo = binDetails[bin];
          const isLocked = binInfo?.readonly;
          const createdAt = binInfo?.createdAt;

          return (
            <List.Item
              key={bin}
              icon={Icon.Tray}
              title={bin}
              subtitle={isLocked ? "Locked" : "Unlocked"} // Display lock status as subtitle
              accessoryTitle={createdAt} // Display creation date as accessory
              actions={BinActions(bin)}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
