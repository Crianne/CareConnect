import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Donation, UserProfile, Patient } from '../types';
import { formatCurrency } from '../lib/utils';

export function generateDonorImpactPdf(
  user: UserProfile,
  donations: Donation[],
  patients: Patient[]
): void {
  // Initialize A4 PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;

  // Filter only verified donations from this donor
  const verifiedDonations = donations
    .filter((d) => d.donorId === user.userId && d.status === 'verified')
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const totalAmount = verifiedDonations.reduce((sum, d) => sum + d.amount, 0);

  // 1. Decorative border
  doc.setDrawColor(20, 184, 166); // Teal primary border
  doc.setLineWidth(1.5);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  doc.setDrawColor(15, 118, 110); // Inner dark teal accent border
  doc.setLineWidth(0.5);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // 2. Header
  doc.setFillColor(15, 23, 42); // Black/Slate-900 background top header block
  doc.rect(15, 15, pageWidth - 30, 25, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('CANCER WARRIORS FOUNDATION', pageWidth / 2, 25, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(20, 184, 166); // Teal text
  doc.text('POLYGON MAINNET BLOCKCHAIN ONCOLOGY LEDGER', pageWidth / 2, 32, { align: 'center' });

  // 3. Document Title
  doc.setTextColor(15, 23, 42); // slate 900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('CERTIFICATE OF TRANSCRIPTIONAL IMPACT', pageWidth / 2, 55, { align: 'center' });

  // 4. Recipient details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate 500
  doc.text('This official certificate records the verified blockchain-minted contributions of', pageWidth / 2, 65, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 118, 110); // deep teal
  doc.text(user.displayName.toUpperCase(), pageWidth / 2, 75, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Donor Public Key Anchor ID: uid-${user.userId.substring(0, 8)} | Email: ${user.email}`, pageWidth / 2, 82, { align: 'center' });

  // 5. Hero stat row
  const startY = 92;
  const boxWidth = 38;
  const boxHeight = 22;
  const boxSpacing = 5;
  const elements = [
    { label: 'LOYALTY LEVEL', val: user.loyaltyTier || 'Bronze Champion' },
    { label: 'TOTAL MOBILIZED', val: `PHP ${totalAmount.toLocaleString()}` },
    { label: 'VERIFIED ACTIONS', val: `${verifiedDonations.length}` },
    { label: 'ACTIVE STREAK', val: `${user.donationStreak || 0} Months` },
  ];

  elements.forEach((el, index) => {
    const x = margin + index * (boxWidth + boxSpacing);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.rect(x, startY, boxWidth, boxHeight, 'FD');

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(el.label, x + boxWidth / 2, startY + 6, { align: 'center' });

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(el.val.length > 15 ? 8 : 10);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(el.val, x + boxWidth / 2, startY + 14, { align: 'center' });
  });

  // 6. Impact statement
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600
  const statement = `This champion support profile guarantees perpetual funding alignment with pediatric oncology treatment plans. Every allocation listed below represents a verified GCash or card transfer finalized with an immutable txn receipt signature mapped onto CareConnect ledger checkpoints, mitigating overhead and information loss.`;
  const splitText = doc.splitTextToSize(statement, pageWidth - margin * 2 - 10);
  doc.text(splitText, margin + 5, startY + 30);

  // 7. Verified Contributions Table
  const tableY = startY + 48;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('ON-CHAIN TRANSACTION LEDGER CLOUD STREAM', margin, tableY - 4);

  const tableData = verifiedDonations.map((d) => {
    const pId = d.patientId;
    const patientAlias = patients.find((p) => p.id === pId)?.publicIdentifier || 'General Medical Pool';
    const originalHash = d.blockchainTxHash || `0x${d.id.padEnd(64, '0')}`;
    const txHashTruncated = `${originalHash.substring(0, 12)}...${originalHash.substring(52)}`;
    
    return [
      new Date(d.timestamp).toLocaleDateString(),
      patientAlias,
      `PHP ${d.amount.toLocaleString()}`,
      d.paymentMethod.toUpperCase(),
      txHashTruncated
    ];
  });

  autoTable(doc, {
    startY: tableY,
    head: [['DATE', 'WARRIOR ALIAS', 'AMOUNT', 'CHANNEL', 'VERIFIED TRANSACTION HASH']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 118, 110], // Deep teal
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 8,
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 35 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 'auto', font: 'courier' }
    },
    margin: { left: margin, right: margin },
    tableWidth: pageWidth - margin * 2
  });

  // Footer / Signatures
  const finalY = (doc as any).lastAutoTable.finalY + 12;

  // Add signature section if page space permits, else add to footer
  if (finalY < pageHeight - 45) {
    // Signature Lines
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.5);
    
    // Left Sig
    doc.line(30, finalY + 15, 80, finalY + 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Oncology Director Panel', 55, finalY + 19, { align: 'center' });
    
    // Right Sig
    doc.line(pageWidth - 80, finalY + 15, pageWidth - 30, finalY + 15);
    doc.text('Trust Operations Lead', pageWidth - 55, finalY + 19, { align: 'center' });

    // Official Seal representation
    doc.setDrawColor(20, 184, 166, 0.4);
    doc.setFillColor(204, 251, 241, 0.2); // light teal fill
    doc.circle(pageWidth / 2, finalY + 12, 10, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(15, 118, 110);
    doc.text('TRUST', pageWidth / 2, finalY + 10.5, { align: 'center' });
    doc.text('SEAL', pageWidth / 2, finalY + 14.5, { align: 'center' });
  }

  // Final copyright footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('CareConnect Transparent Medical Network - Generated Real-Time', pageWidth / 2, pageHeight - 15, { align: 'center' });

  // Open download dialog
  doc.save(`CareConnect_Impact_Certificate_${user.displayName.split(' ')[0]}.pdf`);
}
