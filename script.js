// script.js
// SweetInvoice v2 - main behavior (depends on jspdf, autotable, xlsx)
// Keep CSS external. This script manages data, preview, PDF/Excel exports.

(function () {
  // DOM refs
  const logoInput = document.getElementById('logoInput');
  const logoPreview = document.getElementById('logoPreview');
  const logoPosition = document.getElementById('logoPosition');

  const invoiceNumberEl = document.getElementById('invoiceNumber');
  const invoiceDateEl = document.getElementById('invoiceDate');
  const dueDateEl = document.getElementById('dueDate');
  const invoiceTypeEl = document.getElementById('invoiceType');
  const dateFormatEl = document.getElementById('dateFormat');

  const themeColorEl = document.getElementById('themeColor');
  const accentColorEl = document.getElementById('accentColor');
  const fontSelectEl = document.getElementById('fontSelect');
  const templateSelectEl = document.getElementById('templateSelect');
  const currencySelectEl = document.getElementById('currencySelect');

  const addItemBtn = document.getElementById('addItemBtn');
  const itemsTableBody = document.querySelector('#itemsTable tbody');
  const subtotalCell = document.getElementById('subtotalCell');
  const grandTotalCell = document.getElementById('grandTotalCell');

  const fromName = document.getElementById('fromName');
  const fromCompany = document.getElementById('fromCompany');
  const fromAddress = document.getElementById('fromAddress');
  const fromCity = document.getElementById('fromCity');
  const fromState = document.getElementById('fromState');
  const fromPostal = document.getElementById('fromPostal');

  const clientName = document.getElementById('clientName');
  const clientAddress = document.getElementById('clientAddress');
  const clientCity = document.getElementById('clientCity');
  const clientState = document.getElementById('clientState');
  const clientPostal = document.getElementById('clientPostal');

  const descriptionEl = document.getElementById('description');
  const termsEl = document.getElementById('terms');
  const bankDetailsEl = document.getElementById('bankDetails');

  const exportPDFBtn = document.getElementById('exportPDFBtn');
  const exportExcelBtn = document.getElementById('exportExcelBtn');
  const previewBtn = document.getElementById('previewBtn');
  const showFooterEl = document.getElementById('showFooter');

  // State
  let logoDataUrl = '';
  let items = [];

  // Currency map (can be extended)
  const currencyMap = {
    MAD: 'DH',
    USD: '$',
    EUR: '€',
    GBP: '£'
  };

  // Initialize UI defaults
  function init() {
    // Date defaults
    const today = new Date();
    invoiceDateEl.value = formatForInput(today);
    dueDateEl.value = formatForInput(addDays(today, 30));

    // Invoice number auto-generate and fill
    invoiceNumberEl.value = generateInvoiceNumber();

    // Bind UI events
    logoInput.addEventListener('change', handleLogo);
    themeColorEl.addEventListener('input', applyTheme);
    accentColorEl.addEventListener('input', applyTheme);
    fontSelectEl.addEventListener('change', applyFont);
    currencySelectEl.addEventListener('change', updateTotals);
    addItemBtn.addEventListener('click', addItem);
    exportPDFBtn.addEventListener('click', exportPDF);
    exportExcelBtn.addEventListener('click', exportExcel);
    previewBtn.addEventListener('click', () => console.log(getInvoiceData()));
    templateSelectEl.addEventListener('change', () => {/* template live preview can be added */});
    invoiceNumberEl.addEventListener('change', saveLastInvoiceManual);

    // Start with one empty item
    addItem();
    applyTheme();
    applyFont();
    updateTotals();
  }

  // Helpers
  function formatForInput(date) {
    // YYYY-MM-DD for input[type=date]
    const y = date.getFullYear();
    const m = ('' + (date.getMonth() + 1)).padStart(2, '0');
    const d = ('' + date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  function addDays(dt, days) { const copy = new Date(dt); copy.setDate(copy.getDate() + days); return copy; }

  // Invoice number generation: YYYY/0001 with per-year counter in localStorage
  function generateInvoiceNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const key = `sweetinvoice_last_${year}`;
    let last = parseInt(localStorage.getItem(key) || '0', 10);
    last = last + 1;
    localStorage.setItem(key, String(last));
    const padded = String(last).padStart(4, '0');
    return `${year}/${padded}`;
  }
  function saveLastInvoiceManual() {
    // If user edits number manually, attempt to parse and store the counter part if pattern matches YYYY/NNNN
    const val = invoiceNumberEl.value.trim();
    const m = val.match(/^(\d{4})\/(\d{1,})$/);
    if (m) {
      const year = m[1], num = parseInt(m[2], 10);
      const key = `sweetinvoice_last_${year}`;
      localStorage.setItem(key, String(num));
    }
  }

  // Logo handler
  function handleLogo(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      logoDataUrl = ev.target.result;
      logoPreview.src = logoDataUrl;
    };
    reader.readAsDataURL(file);
  }

  // Theme and font application (HTML preview)
  function applyTheme() {
    const t1 = themeColorEl.value || '#1e90ff';
    const t2 = accentColorEl.value || '#00bfff';
    document.documentElement.style.setProperty('--theme1', t1);
    document.documentElement.style.setProperty('--theme2', t2);
  }
  function applyFont() {
    const font = fontSelectEl.value || 'Inter';
    const mapping = {
      'Inter': "'Inter', sans-serif",
      'Roboto': "'Roboto', sans-serif",
      'Poppins': "'Poppins', sans-serif"
    };
    document.documentElement.style.setProperty('--font-family', mapping[font] || mapping['Inter']);
  }

  // Items management
  function addItem(pref = { product: '', rate: 0, qty: 1 }) {
    const rowIndex = itemsTableBody.children.length + 1;
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td class="sno">${rowIndex}</td>
      <td><input class="item-product" type="text" value="${escapeHtml(pref.product)}" placeholder="Product or description"></td>
      <td><input class="item-rate" type="number" min="0" step="0.01" value="${Number(pref.rate).toFixed(2)}"></td>
      <td><input class="item-qty" type="number" min="0" step="1" value="${Number(pref.qty)}"></td>
      <td class="item-total">0.00</td>
      <td><button class="btn remove">Remove</button></td>
    `;
    itemsTableBody.appendChild(tr);

    // Attach events
    const rateEl = tr.querySelector('.item-rate');
    const qtyEl = tr.querySelector('.item-qty');
    const productEl = tr.querySelector('.item-product');
    const removeBtn = tr.querySelector('.remove');

    rateEl.addEventListener('input', updateTotals);
    qtyEl.addEventListener('input', updateTotals);
    productEl.addEventListener('input', updateTotals);
    removeBtn.addEventListener('click', () => {
      tr.remove();
      renumberRows();
      updateTotals();
    });

    updateTotals();
  }
  function renumberRows() {
    Array.from(itemsTableBody.querySelectorAll('tr')).forEach((tr, idx) => {
      tr.querySelector('.sno').textContent = idx + 1;
    });
  }
  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }

  // Totals
  function updateTotals() {
    const currencySym = currencyMap[currencySelectEl.value] || '';
    let subtotal = 0;
    Array.from(itemsTableBody.querySelectorAll('tr')).forEach(tr => {
      const rate = parseFloat(tr.querySelector('.item-rate').value) || 0;
      const qty = parseFloat(tr.querySelector('.item-qty').value) || 0;
      const total = rate * qty;
      tr.querySelector('.item-total').textContent = formatNumber(total);
      subtotal += total;
    });
    subtotalCell.textContent = formatNumber(subtotal);
    grandTotalCell.textContent = formatNumber(subtotal);
  }
  function formatNumber(num) { return Number(num || 0).toFixed(2); }

  // Build invoiceData object
  function getInvoiceData() {
    const itemsArr = Array.from(itemsTableBody.querySelectorAll('tr')).map((tr, idx) => ({
      sno: idx + 1,
      product: tr.querySelector('.item-product').value,
      rate: parseFloat(tr.querySelector('.item-rate').value) || 0,
      qty: parseFloat(tr.querySelector('.item-qty').value) || 0,
      total: parseFloat(tr.querySelector('.item-total').textContent) || 0
    }));

    // date formatting for display
    const invoiceDateRaw = invoiceDateEl.value;
    const dueDateRaw = dueDateEl.value;
    const dateFormat = dateFormatEl.value;

    return {
      meta: {
        invoiceNumber: invoiceNumberEl.value,
        invoiceType: invoiceTypeEl.value,
        invoiceDateRaw,
        dueDateRaw,
        invoiceDate: formatDateDisplay(invoiceDateRaw, dateFormat),
        dueDate: formatDateDisplay(dueDateRaw, dateFormat),
        template: templateSelectEl.value,
        currency: currencySelectEl.value,
        currencySymbol: currencyMap[currencySelectEl.value] || '',
        theme: { primary: themeColorEl.value, accent: accentColorEl.value },
        font: fontSelectEl.value,
        logo: logoDataUrl,
        logoPosition: logoPosition.value,
        includeFooter: showFooterEl.checked
      },
      from: {
        name: fromName.value,
        company: fromCompany.value,
        address: fromAddress.value,
        city: fromCity.value,
        state: fromState.value,
        postal: fromPostal.value
      },
      to: {
        name: clientName.value,
        address: clientAddress.value,
        city: clientCity.value,
        state: clientState.value,
        postal: clientPostal.value
      },
      items: itemsArr,
      totals: {
        subtotal: parseFloat(subtotalCell.textContent) || 0,
        grandTotal: parseFloat(grandTotalCell.textContent) || 0
      },
      extra: {
        description: descriptionEl.value,
        terms: termsEl.value,
        bankDetails: bankDetailsEl.value
      }
    };
  }

  // Date display formatter
  function formatDateDisplay(inputValue, format) {
    if (!inputValue) return '';
    const d = new Date(inputValue);
    if (isNaN(d)) return inputValue;
    const dd = ('' + d.getDate()).padStart(2, '0');
    const mm = ('' + (d.getMonth() + 1)).padStart(2, '0');
    const yyyy = d.getFullYear();
    if (format === 'DD/MM/YYYY') return `${dd}/${mm}/${yyyy}`;
    if (format === 'MM/DD/YYYY') return `${mm}/${dd}/${yyyy}`;
    return `${yyyy}-${mm}-${dd}`;
  }

  // PDF Export
  async function exportPDF() {
  updateTotals();
  const data = getInvoiceData();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 40;

  // Font mapping (jsPDF only supports core fonts unless custom fonts embedded)
  const fontMap = {
    'Inter': 'helvetica',
    'Roboto': 'helvetica',
    'Poppins': 'times'
  };
  const fontForPdf = fontMap[data.meta.font] || 'helvetica';
  doc.setFont(fontForPdf);

  // Theme colors
  const primaryRgb = hexToRgb(data.meta.theme.primary);
  const accentRgb = hexToRgb(data.meta.theme.accent);

  // Header: logo
  if (data.meta.logo) {
    try {
      const imgProps = doc.getImageProperties(data.meta.logo);
      const maxW = 120;
      const ratio = imgProps.width / imgProps.height;
      const h = Math.min(60, maxW / ratio);
      const w = Math.min(maxW, ratio * h);
      let x = margin;
      if (data.meta.logoPosition === 'center') x = (pageWidth - w) / 2;
      if (data.meta.logoPosition === 'right') x = pageWidth - margin - w;
      doc.addImage(data.meta.logo, 'PNG', x, y, w, h);
    } catch (err) {}
  }

  // Title
  doc.setFontSize(22);
  doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
  doc.text('INVOICE', pageWidth - margin, y + 20, { align: 'right' });

  y += 80;

  // From / To
  doc.setFillColor(250, 250, 250);
  doc.rect(margin, y, 260, 80, 'F');
  doc.rect(margin + 280, y, 260, 80, 'F');

  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text('From:', margin + 6, y + 16);
  doc.text(data.from.name || '', margin + 6, y + 30);
  doc.text(data.from.company || '', margin + 6, y + 44);

  doc.text('To:', margin + 286, y + 16);
  doc.text(data.to.name || '', margin + 286, y + 30);
  doc.text(data.to.address || '', margin + 286, y + 44);

  // Invoice meta
  doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
  doc.setFontSize(11);
  const invoiceMetaY = y + 100;
  doc.text(`Invoice #: ${data.meta.invoiceNumber}`, margin, invoiceMetaY);
  doc.text(`Type: ${data.meta.invoiceType}`, margin + 200, invoiceMetaY);
  doc.text(`Date: ${data.meta.invoiceDate}`, margin + 350, invoiceMetaY);
  doc.text(`Due: ${data.meta.dueDate}`, margin + 350, invoiceMetaY + 14);

  // Items table
  const tableStartY = invoiceMetaY + 40;
  const head = [['S.No', 'Product', 'Rate', 'Qty', 'Total']];

  const body = data.items.map(it => [
    String(it.sno),
    it.product || '',
    `${Number(it.rate).toFixed(2)} ${data.meta.currencySymbol}`,
    String(it.qty),
    `${Number(it.total).toFixed(2)} ${data.meta.currencySymbol}`
  ]);

  doc.autoTable({
    startY: tableStartY,
    head: head,
    body: body,
    styles: { font: fontForPdf, fontSize: 10, cellPadding: 6 },
    headStyles: {
      fillColor: [primaryRgb.r, primaryRgb.g, primaryRgb.b],
      textColor: 255
    },
    theme: data.meta.template === 'modern' ? 'striped' : 'grid',
    margin: { left: margin, right: margin }
  });

  let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : tableStartY + 140;

  // Totals with padding
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(`Subtotal: ${Number(data.totals.subtotal).toFixed(2)} ${data.meta.currencySymbol}`,
           pageWidth - margin, finalY, { align: 'right' });

  finalY += 20;
  doc.setFontSize(14);
  doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
  doc.text(`Grand Total: ${Number(data.totals.grandTotal).toFixed(2)} ${data.meta.currencySymbol}`,
           pageWidth - margin, finalY, { align: 'right' });

  // Extra sections
  finalY += 30;
  const addSection = (title, content) => {
    if (content) {
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text(title, margin, finalY);
      finalY += 14;
      doc.setFontSize(10);
      doc.setTextColor(50);
      const wrapped = doc.splitTextToSize(content, pageWidth - 2 * margin);
      doc.text(wrapped, margin, finalY);
      finalY += wrapped.length * 12 + 18;
    }
  };

  addSection('Description:', data.extra.description);
  addSection('Terms & Conditions:', data.extra.terms);
  addSection('Bank Details:', data.extra.bankDetails);

  // Footer
  if (data.meta.includeFooter) {
    const footerY = doc.internal.pageSize.getHeight() - 30;
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text('Generated by Hamza Labbaalli | hlnajz.com', margin, footerY);
  }

  // Save
  const fileName = `${data.meta.invoiceNumber || 'invoice'}.pdf`;
  doc.save(fileName);
}


  // Excel Export using XLSX
  function exportExcel() {
    updateTotals();
    const data = getInvoiceData();
    const wb = XLSX.utils.book_new();

    // Header rows
    const wsData = [];
    wsData.push(['Invoice', data.meta.invoiceNumber]);
    wsData.push(['Type', data.meta.invoiceType]);
    wsData.push(['Date', data.meta.invoiceDate]);
    wsData.push([]);
    wsData.push(['From', '', '', 'To', '']);
    wsData.push([data.from.name || '', '', '', data.to.name || '']);
    wsData.push([data.from.company || '', '', '', data.to.address || '']);
    wsData.push([]);
    wsData.push(['S.No', 'Product', 'Rate', 'Qty', 'Total']);

    data.items.forEach(it => {
      wsData.push([it.sno, it.product, it.rate, it.qty, it.total]);
    });

    wsData.push([]);
    wsData.push(['', '', '', 'Subtotal', data.totals.subtotal]);
    wsData.push(['', '', '', 'Grand Total', data.totals.grandTotal]);
    wsData.push([]);
    wsData.push(['Description', data.extra.description || '']);
    wsData.push(['Terms', data.extra.terms || '']);
    wsData.push(['Bank Details', data.extra.bankDetails || '']);
    if (data.meta.includeFooter) wsData.push([], ['Generated by hlnajz | hlnajz.com']);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Invoice');
    const filename = `${data.meta.invoiceNumber || 'invoice'}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  // Utility: split text into lines for jsPDF text method
  function splitText(doc, text, maxWidth) {
    return doc.splitTextToSize(text, maxWidth);
  }

  // hex to rgb
  function hexToRgb(hex) {
    if (!hex) hex = '#000000';
    hex = hex.replace('#', '');
    const bigint = parseInt(hex, 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
  }

  // Update totals on input changes
  document.addEventListener('input', (e) => {
    if (e.target.matches('.item-rate') || e.target.matches('.item-qty') || e.target.matches('.item-product')) {
      updateTotals();
    }
  });

  // Initialize on load
  init();

  // Expose getInvoiceData to window for debugging if needed
  window.getInvoiceData = getInvoiceData;
})();

