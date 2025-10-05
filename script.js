let items = [];

// Define themes by your names
const themeColors = [
    ["#1e90ff", "#00bfff"], // Sea
    ["#ffd700", "#ff8c00"], // Sunny
    ["#87ceeb", "#4682b4"], // Sky
    ["#8707ff", "#ff78f5"], // HLNAJZ
    ["#ff4500", "#ffa500"]  // Orange
];

// Apply selected theme to inputs, table, titles
const themeSelect = document.getElementById("themeSelect");
themeSelect.addEventListener("change", () => {
    const theme = themeColors[themeSelect.value];
    document.documentElement.style.setProperty('--theme1', theme[0]);
    document.documentElement.style.setProperty('--theme2', theme[1]);

    // Update table headers, buttons, labels, and inputs
    document.querySelectorAll("h1, h3, label, button").forEach(el => {
        el.style.color = theme[1];
    });
    document.querySelectorAll(".input").forEach(el => {
        el.style.borderColor = theme[0];
    });
    document.querySelectorAll("table").forEach(el => {
        el.style.borderColor = theme[0];
    });
});

// Add item
function addItem() {
    const tbody = document.querySelector("#itemsTable tbody");
    const row = document.createElement("tr");

    row.innerHTML = `
        <td><input type="text" placeholder="Item name" class="input item-name"></td>
        <td><input type="number" placeholder="Price" class="input item-price" min="0"></td>
        <td><input type="number" placeholder="Qty" class="input item-qty" min="1" value="1"></td>
        <td class="item-total">0</td>
        <td><button onclick="removeItem(this)">Remove</button></td>
    `;

    tbody.appendChild(row);
    row.querySelectorAll("input").forEach(input => input.addEventListener("input", updateTotals));
    updateTotals();
}

function removeItem(btn) {
    btn.closest("tr").remove();
    updateTotals();
}

function updateTotals() {
    const rows = document.querySelectorAll("#itemsTable tbody tr");
    let grandTotal = 0;
    rows.forEach(row => {
        const price = parseFloat(row.querySelector(".item-price").value) || 0;
        const qty = parseInt(row.querySelector(".item-qty").value) || 1;
        const total = price * qty;
        row.querySelector(".item-total").textContent = total.toFixed(2);
        grandTotal += total;
    });
    document.getElementById("grandTotal").textContent = grandTotal.toFixed(2);
}

// Logo preview
document.getElementById("logoInput").addEventListener("change", function () {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => document.getElementById("logoPreview").src = e.target.result;
        reader.readAsDataURL(file);
    }
});

// Export PDF
function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');
    let y = 40;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Get selected theme
    const theme = themeColors[themeSelect.value];
    const color1 = theme[0];
    const color2 = theme[1];

    // Title
    doc.setFontSize(28);
    doc.setTextColor(color2);
    doc.text("INVOICE", pageWidth - 100, y, { align: "right" });

    // From / To boxes
    doc.setFillColor(240, 240, 240);
    doc.rect(40, y + 20, 240, 80, 'F');
    doc.rect(310, y + 20, 240, 80, 'F');

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("From:", 50, y + 40);
    doc.text(document.getElementById("fromName").value, 50, y + 55);
    doc.text(document.getElementById("fromAddress").value, 50, y + 70);

    doc.text("To:", 320, y + 40);
    doc.text(document.getElementById("clientName").value, 320, y + 55);
    doc.text(document.getElementById("clientAddress").value, 320, y + 70);

    // Invoice details box
    doc.rect(40, y + 110, 510, 60, 'F');
    doc.setTextColor(color2);
    doc.text(`Invoice #: ${document.getElementById("invoiceNumber").value}`, 50, y + 130);
    doc.text(`Invoice Date: ${document.getElementById("invoiceDate").value}`, 50, y + 145);
    doc.text(`Due Date: ${document.getElementById("dueDate").value}`, 50, y + 160);

    y += 180;

    // Items table
    const rows = [];
    document.querySelectorAll("#itemsTable tbody tr").forEach(row => {
        rows.push([
            row.querySelector(".item-name").value,
            row.querySelector(".item-price").value,
            row.querySelector(".item-qty").value,
            row.querySelector(".item-total").textContent
        ]);
    });

    doc.setFontSize(14);
    doc.setTextColor(color2);
    doc.text("Items", 40, y);

    y += 10;
    doc.autoTable({
        startY: y,
        head: [['Item', 'Price', 'Qty', 'Total']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: colorHexToRgb(color1), textColor: 255 },
        styles: { fillColor: [255, 255, 255], textColor: 0, fontSize: 12 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 40, right: 40 }
    });

    y = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(16);
    doc.setTextColor(color2);
    doc.text(`Grand Total: $${document.getElementById("grandTotal").textContent}`, pageWidth - 180, y, { align: 'right' });

    const description = document.getElementById("description").value;
    if (description) {
        y += 30;
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`Notes: ${description}`, 40, y);
    }

    doc.save("invoice.pdf");
}

// Export Excel
function exportExcel() {
    const wb = XLSX.utils.book_new();
    const ws_data = [["Item", "Price", "Quantity", "Total"]];
    document.querySelectorAll("#itemsTable tbody tr").forEach(row => {
        const item = row.querySelector(".item-name").value;
        const price = row.querySelector(".item-price").value;
        const qty = row.querySelector(".item-qty").value;
        const total = row.querySelector(".item-total").textContent;
        ws_data.push([item, price, qty, total]);
    });
    ws_data.push(["", "", "Grand Total", document.getElementById("grandTotal").textContent]);
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, "Invoice");
    XLSX.writeFile(wb, "invoice.xlsx");
}

// Helper: convert hex to rgb array
function colorHexToRgb(hex) {
    hex = hex.replace("#", "");
    const bigint = parseInt(hex, 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}
