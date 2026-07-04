function formatJson(result) {
    return JSON.stringify(result, null, 2);
}

function formatText(result) {
    return `${result.detail} = ${result.total}`;
}

function formatHtml(result) {
    const detailHtml = result.detail.replace(
        /(\d+)(?=[^\]]*\])/g,
        '<span class="die">$1</span>'
    ).replace(
        /\[([^\]]+)\]/g,
        '<span class="dice-group">[$1]</span>'
    );

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Roll: ${escapeHtml(result.expression)}</title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: 'Courier New', monospace;
        background: #1a1a2e;
        color: #e0e0e0;
        display: flex; justify-content: center; align-items: center;
        min-height: 100vh; padding: 20px;
    }
    .roll-card {
        background: #16213e;
        border: 2px solid #e94560;
        border-radius: 12px;
        padding: 24px 32px;
        max-width: 600px; width: 100%;
    }
    .expression { color: #a0a0a0; font-size: 0.9em; margin-bottom: 4px; }
    .detail { font-size: 1.3em; margin-bottom: 8px; }
    .die { color: #f5c542; font-weight: bold; }
    .dice-group { color: #7ec8e3; }
    .op { color: #ff6b6b; }
    .total-line { font-size: 2em; }
    .total { color: #e94560; font-weight: bold; font-size: 1.2em; }
    .source { color: #555; font-size: 0.7em; margin-top: 12px; }
</style>
</head>
<body>
<div class="roll-card">
    <div class="expression">${escapeHtml(result.expression)}</div>
    <div class="detail">${detailHtml}</div>
    <div class="total-line"> = <span class="total">${result.total}</span></div>
    <div class="source">fuente: ${escapeHtml(result.source)}</div>
</div>
</body>
</html>`;
}

function escapeHtml(str) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return str.replace(/[&<>"']/g, c => map[c]);
}

function formatRaw(result) {
    return String(result.total);
}

module.exports = { formatJson, formatText, formatHtml, formatRaw };
