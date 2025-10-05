
        let items = [];

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

        document.getElementById("logoInput").addEventListener("change", function () {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = e => document.getElementById("logoPreview").src = e.target.result;
                reader.readAsDataURL(file);
            }
        });

        function exportPDF() {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'pt', 'a4');
            let y = 40;

            const logo = document.getElementById("logoPreview");
            if (logo.src) doc.addImage(logo.src, 'PNG', 40, y, 120, 60);

            y += 80;
            doc.setFontSize(16);
            doc.text("Invoice", 450, 70);

            doc.setFontSize(12);
            doc.text(`From: ${document.getElementById("fromName").value}`, 40, y);
            doc.text(`${document.getElementById("fromAddress").value}`, 40, y + 15);
            doc.text(`To: ${document.getElementById("clientName").value}`, 300, y);
            doc.text(`${document.getElementById("clientAddress").value}`, 300, y + 15);

            doc.text(`Invoice #: ${document.getElementById("invoiceNumber").value}`, 40, y + 45);
            doc.text(`Invoice Date: ${document.getElementById("invoiceDate").value}`, 40, y + 60);
            doc.text(`Due Date: ${document.getElementById("dueDate").value}`, 40, y + 75);

            y += 100;
            doc.text("Item", 40, y);
            doc.text("Price", 280, y);
            doc.text("Qty", 380, y);
            doc.text("Total", 480, y);
            y += 10;

            const rows = document.querySelectorAll("#itemsTable tbody tr");
            rows.forEach(row => {
                y += 20;
                const item = row.querySelector(".item-name").value;
                const price = row.querySelector(".item-price").value;
                const qty = row.querySelector(".item-qty").value;
                const total = row.querySelector(".item-total").textContent;
                doc.text(item, 40, y);
                doc.text(price, 280, y);
                doc.text(qty, 380, y);
                doc.text(total, 480, y);
            });

            y += 30;
            doc.setFontSize(14);
            doc.text(`Grand Total: $${document.getElementById("grandTotal").textContent}`, 40, y);

            const description = document.getElementById("description").value;
            if (description) {
                y += 30;
                doc.setFontSize(12);
                doc.text(`Notes: ${description}`, 40, y);
            }

            doc.save("invoice.pdf");
        }

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
