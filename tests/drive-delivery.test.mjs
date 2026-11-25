import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
test("Drive delivery resolves the stored file ID when the product title differs from its filename", () => {
  const sent = [];
  const requestedFiles = [];
  const title = "ערכת מוצר חדשה";
  const context = {
    console,
    Logger: { log() {} },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: () => "test-only-secret" }),
    },
    UrlFetchApp: {
      fetch: (url, options) => {
        assert.equal(url, "https://haganenet-barbur.com/api/drive-products");
        assert.equal(options.headers["X-Barbur-Key"], "test-only-secret");
        return {
          getResponseCode: () => 200,
          getContentText: () =>
            JSON.stringify({ files: { [title]: "linked-drive-file-id" } }),
        };
      },
    },
    DriveApp: {
      getFileById: (id) => {
        requestedFiles.push(id);
        return { getBlob: () => ({ id }) };
      },
      getFolderById: () => ({
        getFilesByName: () => ({ hasNext: () => false }),
        getFiles: () => ({ hasNext: () => false }),
      }),
    },
    MailApp: { sendEmail: (email) => sent.push(email) },
    SpreadsheetApp: {
      openById: () => ({
        getSheets: () => [
          {
            getDataRange: () => ({ getValues: () => [["header"]] }),
            getRange: () => ({ setValue() {} }),
          },
        ],
      }),
    },
  };
  vm.createContext(context);
  new vm.Script(fs.readFileSync("apps-script-update.js", "utf8")).runInContext(
    context,
  );
  context.sendManualEmail(["buyer@example.test"], [title + ".pdf"]);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].attachments[0].id, "linked-drive-file-id");
  assert.ok(requestedFiles.includes("linked-drive-file-id"));
  assert.ok(context.getFilesList().includes(title + ".pdf"));
});
test("the connection bridge fails clearly on rejected credentials and makes no request before setup", () => {
  let calls = 0;
  let secret = "";
  const context = {
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: () => secret }),
    },
    UrlFetchApp: {
      fetch: () => {
        calls++;
        return { getResponseCode: () => 401 };
      },
    },
  };
  vm.createContext(context);
  new vm.Script(fs.readFileSync("apps-script-update.js", "utf8")).runInContext(
    context,
  );
  assert.deepEqual(Object.keys(context.getStoreDriveFileMap()), []);
  assert.equal(calls, 0);
  secret = "test-only-secret";
  assert.throws(
    () => context.getStoreDriveFileMap(),
    /BARBUR_CATALOG_PASSWORD/,
  );
});
