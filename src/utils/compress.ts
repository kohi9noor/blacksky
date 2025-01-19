import archiver from "archiver";
import * as fs from "fs";
import * as path from "path";
import * as unzipper from "unzipper";

export function createZipBackup(
  sourcePath: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      resolve();
    });

    archive.on("error", (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.file(sourcePath, { name: path.basename(sourcePath) });
    archive.finalize();
  });
}

export function decompressZipBackup(
  zipFilePath: string,
  extractToPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.createReadStream(zipFilePath)
      .pipe(unzipper.Extract({ path: extractToPath }))
      .on("close", () => {
        resolve();
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}
