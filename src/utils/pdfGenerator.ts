import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { AppState } from '../types';
import { PAGE_TITLES, RATES } from '../constants';
import { COMPANY } from '../config/company';

const BLUE_BRAND = [0, 0, 0]; // Black/Dark for luxury feel

export const generateCloseoutPDF = async (state: AppState): Promise<string> => {
  const doc = new jsPDF() as any;
  const { jobInfo, pages, userRole, customerSignatureCloudinaryUrl } = state;

  // Header
  doc.setFillColor(...BLUE_BRAND);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY.name.toUpperCase(), 20, 20);
  doc.setFontSize(10);
  doc.text('VERIFIED BUILD PASSPORT', 20, 28);

  // Info Section
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`Project: ${jobInfo.jobName}`, 20, 50);
  doc.text(`Address: ${jobInfo.jobAddress}`, 20, 58);
  doc.text(`Lead: ${jobInfo.crewLeadName}`, 20, 66);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 50);
  doc.text(`Type: ${jobInfo.jobType}`, 140, 58);
  doc.text(`Role: ${userRole}`, 140, 66);

  let y = 80;

  // Checklists and Embedded Photos
  [1, 2, 3, 4, 5].forEach(pageIdx => {
    const page = pages[pageIdx];
    if (!page) return;
    
    // Page break if near bottom
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(PAGE_TITLES[pageIdx], 20, y);
    y += 5;

    const tableData = page.checklist.map(item => [
      item.completed ? '[X]' : '[ ]',
      item.label
    ]);

    doc.autoTable({
      startY: y,
      head: [['Status', 'Compliance Item']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: BLUE_BRAND },
      margin: { left: 20, right: 20 }
    });

    y = (doc as any).lastAutoTable.finalY + 15;
    
    // Photo Embedding Grid
    const validPhotos = page.photos.filter(p => !!p.url);
    if (validPhotos.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${PAGE_TITLES[pageIdx]} - Site Photos:`, 20, y);
      y += 8;

      const photoWidth = 80;
      const photoHeight = 60;
      const margin = 20;
      const gap = 10;

      for (let i = 0; i < validPhotos.length; i++) {
        const photo = validPhotos[i];
        if (!photo.url) continue;

        const isSecondInRow = i % 2 === 1;
        const xPos = margin + (isSecondInRow ? photoWidth + gap : 0);

        // Check for page break (Image + Label)
        if (y + photoHeight + 10 > 280) {
          doc.addPage();
          y = 20;
        }

        try {
          // Use the local base64 URL for embedding
          doc.addImage(photo.url, 'JPEG', xPos, y, photoWidth, photoHeight, undefined, 'FAST');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(photo.label, xPos, y + photoHeight + 5);
        } catch (e) {
          console.error("Error adding image to PDF", e);
          doc.setFontSize(8);
          doc.text(`[Error loading image: ${photo.label}]`, xPos, y + 10);
        }

        // Advance Y if row is finished or last photo
        if (isSecondInRow || i === validPhotos.length - 1) {
          y += photoHeight + 15;
        }
      }
    }

    y += 5; // Section Spacer
  });

  // Warranty Page
  doc.addPage();
  doc.setFillColor(...BLUE_BRAND);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY.name.toUpperCase(), 20, 20);
  doc.setFontSize(10);
  doc.text('5-YEAR WORKMANSHIP WARRANTY', 20, 28);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.text('Certified Quality Guarantee', 20, 60);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const warrantyText = [
    `${COMPANY.name} stands behind every project with our industry-leading 5-Year Workmanship Warranty.`,
    '',
    'This warranty covers all aspects of the installation and labour performed by our certified teams. ',
    'We guarantee that your project has been built to the highest standards of structural integrity ',
    'and aesthetic finish as outlined in our Verified Build Passport.',
    '',
    'Warranty Coverage Includes:',
    '\u2022 Structural framing integrity',
    '\u2022 Fastener and hardware performance',
    '\u2022 Decking and railing installation alignment',
    '\u2022 Workmanship-related settlement or movement',
    '',
    'This warranty is a testament to our commitment to excellence and your long-term satisfaction.',
    'For any warranty-related inquiries, please contact our office with your Job Number.'
  ];
  
  doc.text(warrantyText, 20, 75);

  // Signature Section
  if (state.customerSignature) {
    if (y > 230) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER SIGN-OFF', 20, y + 10);
    
    // Embed actual signature image if available
    try {
      doc.addImage(state.customerSignature, 'PNG', 20, y + 15, 60, 30);
    } catch (e) {
      console.warn("Could not embed signature image", e);
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('The customer confirms the project is complete and satisfactory.', 20, y + 50);
    doc.text(`Customer Name: ${jobInfo.customerName}`, 20, y + 58);
    doc.text(`Date Signed: ${new Date().toLocaleString()}`, 20, y + 66);
    
    if (customerSignatureCloudinaryUrl) {
      doc.setTextColor(0, 0, 255);
      doc.text(`Verified High-Res Signature: ${customerSignatureCloudinaryUrl}`, 20, y + 74);
      doc.setTextColor(0, 0, 0);
    }
  }

  return doc.output('datauristring');
};

export const generateInvoicePDF = async (state: AppState): Promise<string> => {
  const doc = new jsPDF() as any;
  const { jobInfo, invoicing } = state;
  const r = RATES as any;
  const d = invoicing as any;

  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('SUBCONTRACTOR INVOICE', 20, 25);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Subcontractor: ${jobInfo.crewLeadName}`, 20, 50);
  doc.text(`Project: ${jobInfo.jobName}`, 20, 58);
  doc.text(`Address: ${jobInfo.jobAddress}`, 20, 66);
  doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, 140, 50);

  const items: any[] = [];
  let subtotal = 0;

  const checkAndAdd = (field: string, label: string, unit: string) => {
    if (d[field] > 0) {
      const lineTotal = d[field] * r[field];
      subtotal += lineTotal;
      items.push([label, d[field], unit, `$${r[field].toFixed(2)}`, `$${lineTotal.toFixed(2)}`]);
    }
  };

  checkAndAdd('deckSqft', 'Core Framing & Decking', 'SQFT');
  checkAndAdd('standardStairLf', 'Standard Stairs', 'LF');
  checkAndAdd('helicalPiles', 'Helical Piles', 'EA');
  checkAndAdd('railingPosts', 'Alum Railing Posts', 'EA');
  if (d.customWorkAmount > 0) {
     subtotal += d.customWorkAmount;
     items.push([d.customWorkDescription || 'Custom Work', 1, 'JOB', `$${d.customWorkAmount.toFixed(2)}`, `$${d.customWorkAmount.toFixed(2)}`]);
  }

  doc.autoTable({
    startY: 80,
    head: [['Description', 'Qty', 'Unit', 'Rate', 'Total']],
    body: items,
    theme: 'grid',
    headStyles: { fillColor: [0, 0, 0] }
  });

  const finalY = doc.lastAutoTable.finalY + 10;
  const hst = subtotal * 0.13;
  const grandTotal = subtotal + hst;

  doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 140, finalY);
  doc.text(`HST (13%): $${hst.toFixed(2)}`, 140, finalY + 8);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL DUE: $${grandTotal.toFixed(2)}`, 140, finalY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Payment Terms: E-transfer to ${COMPANY.officeEmail}`, 20, finalY + 40);
  doc.text('Note: Invoice submitted with completed QC package.', 20, finalY + 48);

  return doc.output('datauristring');
};