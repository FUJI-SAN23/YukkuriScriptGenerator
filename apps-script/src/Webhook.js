// 列定義は将来拡張を見据えて一箇所に集約する
const SHEET_HEADERS = ["行番号", "話者", "セリフ"];

// Webhook 入口でリクエストを受け取り JSON 形式のレスポンスを返す
function doPost(e) {
  // Web アプリのエントリーポイントとして処理を委譲する
  const result = handlePostRequest(e);
  return buildJsonResponse(result);
}

// Webhook 全体の制御フローをまとめ、各処理の結果を合成する
function handlePostRequest(e) {
  // 依存関係を順に検証し、失敗時は即時にレスポンスを返す
  const configResult = getConfig();
  if (!configResult.ok) {
    logErrorResponse(configResult.response);
    return configResult.response;
  }

  const authResult = authenticateRequest(e, configResult.value.token);
  if (!authResult.ok) {
    logErrorResponse(authResult.response);
    return authResult.response;
  }

  const requestResult = parseRequestPayload(e);
  if (!requestResult.ok) {
    logErrorResponse(requestResult.response);
    return requestResult.response;
  }

  const tsvResult = parseTsv(requestResult.value.scriptTsv);
  if (!tsvResult.ok) {
    logErrorResponse(tsvResult.response);
    return tsvResult.response;
  }

  const writeResult = createSheetAndWrite(
    configResult.value.spreadsheetId,
    requestResult.value.theme,
    tsvResult.value.rows,
  );
  if (!writeResult.ok) {
    logErrorResponse(writeResult.response);
    return writeResult.response;
  }

  return buildSuccessResponse(
    writeResult.value.sheetName,
    writeResult.value.rowsWritten,
    tsvResult.value.rowsSkipped,
  );
}

// スクリプトプロパティから必要な設定を取得して検証する
function getConfig() {
  // 設定値は Script Properties に集約し、コードに埋め込まない
  const properties = PropertiesService.getScriptProperties();
  const token = properties.getProperty("TOKEN");
  const spreadsheetId = properties.getProperty("SPREADSHEET_ID");

  if (!token || !spreadsheetId) {
    return {
      ok: false,
      response: buildErrorResponse(
        "config_missing",
        "必要な設定が不足しています。",
        0,
      ),
    };
  }

  return {
    ok: true,
    value: {
      token: token,
      spreadsheetId: spreadsheetId,
    },
  };
}

// 受信リクエストに含まれるトークンを検証して認可を判定する
function authenticateRequest(e, expectedToken) {
  // リダイレクトでヘッダが落ちる環境があるため、複数経路からトークンを拾う
  const headers = e && e.headers ? e.headers : {};
  const tokenFromHeader =
    headers["x-webhook-token"] ||
    headers["X-Webhook-Token"] ||
    headers["X-WEBHOOK-TOKEN"] ||
    "";
  const tokenFromQuery =
    e && e.parameter ? e.parameter.token || e.parameter.TOKEN || "" : "";

  let tokenFromBody = "";
  try {
    if (e && e.postData && e.postData.contents) {
      const payload = JSON.parse(e.postData.contents);
      tokenFromBody =
        payload && (payload.token || payload.TOKEN) ? payload.token || payload.TOKEN : "";
    }
  } catch (error) {
    // 本文が壊れていても、ヘッダ/クエリの認証ができるためここでは失敗させない
  }

  const token = tokenFromHeader || tokenFromQuery || tokenFromBody || "";

  if (!token) {
    return {
      ok: false,
      response: buildErrorResponse("token_missing", "認証に失敗しました。", 0),
    };
  }

  if (token !== expectedToken) {
    return {
      ok: false,
      response: buildErrorResponse("token_mismatch", "認証に失敗しました。", 0),
    };
  }

  return { ok: true };
}

// JSON 本文から必要なパラメータを抽出して検証する
function parseRequestPayload(e) {
  // 本文が空の場合は安全側でエラーにする
  if (!e || !e.postData || !e.postData.contents) {
    return {
      ok: false,
      response: buildErrorResponse(
        "invalid_request",
        "リクエストが不正です。",
        0,
      ),
    };
  }

  let payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (error) {
    return {
      ok: false,
      response: buildErrorResponse("invalid_json", "JSON が不正です。", 0),
    };
  }

  const theme =
    payload && typeof payload.theme === "string" ? payload.theme : "";
  const scriptTsv =
    payload && typeof payload.script_tsv === "string" ? payload.script_tsv : "";

  if (!theme || !scriptTsv) {
    return {
      ok: false,
      response: buildErrorResponse(
        "invalid_payload",
        "必要な項目が不足しています。",
        0,
      ),
    };
  }

  return {
    ok: true,
    value: {
      theme: theme,
      scriptTsv: scriptTsv,
    },
  };
}

// 受信した TSV を行配列に変換し、不正行数も集計する
function parseTsv(tsv) {
  // TSV の解析は副作用を持たない純粋処理として分離する
  if (typeof tsv !== "string") {
    return {
      ok: false,
      response: buildErrorResponse("invalid_tsv", "TSV が不正です。", 0),
    };
  }

  const lines = tsv.split(/\r?\n/);
  const rows = [];
  let skipped = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line || line.trim() === "") {
      // 空行はスキップ対象だがカウントしない
      continue;
    }

    const separatorIndex = line.indexOf("\t");
    if (separatorIndex === -1) {
      skipped += 1;
      continue;
    }

    const speaker = line.slice(0, separatorIndex).trim();
    const speech = line.slice(separatorIndex + 1).trim();

    if (!speaker || !speech) {
      skipped += 1;
      continue;
    }

    rows.push([rows.length + 1, speaker, speech]);
  }

  return {
    ok: true,
    value: {
      rows: rows,
      rowsSkipped: skipped,
    },
  };
}

// 新しいシートを作成し、ヘッダと本文をまとめて書き込む
function createSheetAndWrite(spreadsheetId, theme, rows) {
  // ここでのみスプレッドシートに書き込む
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheetName = buildSheetName(spreadsheet, theme);
    const sheet = spreadsheet.insertSheet(sheetName);

    const values = [SHEET_HEADERS].concat(rows);
    sheet.getRange(1, 1, values.length, SHEET_HEADERS.length).setValues(values);

    return {
      ok: true,
      value: {
        sheetName: sheetName,
        rowsWritten: rows.length,
      },
    };
  } catch (error) {
    return {
      ok: false,
      response: buildErrorResponse(
        "write_failed",
        "書き込みに失敗しました。",
        0,
      ),
    };
  }
}

// シート名の採番とテーマ整形を組み合わせて最終名を返す
function buildSheetName(spreadsheet, theme) {
  // 採番と正規化をまとめてシート名を構築する
  const sequence = getNextSheetNumber(spreadsheet);
  const normalizedTheme = normalizeTheme(theme);
  return formatSequence(sequence) + "_" + normalizedTheme;
}

// 既存シートを走査して次の連番を算出する
function getNextSheetNumber(spreadsheet) {
  // 既存シート名の最大値から次の連番を計算する
  const sheets = spreadsheet.getSheets();
  let maxNumber = 0;

  for (let i = 0; i < sheets.length; i += 1) {
    const name = sheets[i].getName();
    const match = name.match(/^(\d{3})_/);
    if (!match) {
      continue;
    }

    const number = parseInt(match[1], 10);
    if (number > maxNumber) {
      maxNumber = number;
    }
  }

  let next = maxNumber + 1;
  if (next > 999) {
    // 999 超えは仕様に従って 001 に戻す
    next = 1;
  }

  return next;
}

// テーマ文字列をシート名に使えるよう整形し長さを制限する
function normalizeTheme(theme) {
  // シート名に使えない文字は _ に置換し、長さを制限する
  const trimmed = theme.trim();
  const replaced = trimmed.replace(/[:\\/\?\[\]]/g, "_");
  return replaced.substring(0, 20);
}

// 連番を 3 桁固定の文字列に変換する
function formatSequence(number) {
  // 連番を 3 桁のゼロ埋め表現に揃える
  const padded = "000" + number;
  return padded.slice(-3);
}

// 正常系レスポンスを API 仕様に合わせて組み立てる
function buildSuccessResponse(sheetName, rowsWritten, rowsSkipped) {
  // 成功時のレスポンス形式を統一する
  return {
    ok: true,
    sheet_name: sheetName,
    rows_written: rowsWritten,
    rows_skipped: rowsSkipped,
  };
}

// 異常系レスポンスを API 仕様に合わせて組み立てる
function buildErrorResponse(code, message, rowsSkipped) {
  // 失敗時のレスポンス形式を統一する
  return {
    ok: false,
    error: {
      code: code,
      message: message,
    },
    rows_skipped: rowsSkipped,
  };
}

// JSON 出力用の ContentService レスポンスを生成する
function buildJsonResponse(payload) {
  // JSON として返すための ContentService ラッパー
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

// 失敗時のみ最小情報をログに残し、秘密情報は記録しない
function logErrorResponse(response) {
  if (!response || response.ok) {
    return;
  }

  const errorCode = response.error && response.error.code ? response.error.code : "unknown_error";
  const rowsSkipped =
    typeof response.rows_skipped === "number" ? response.rows_skipped : 0;
  const requestId = Utilities.getUuid();

  console.log(
    JSON.stringify({
      level: "error",
      request_id: requestId,
      error_code: errorCode,
      rows_skipped: rowsSkipped,
      timestamp: new Date().toISOString(),
    }),
  );
}
