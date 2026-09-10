import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { SITE_URL } from '@/lib/site';

export function verificationUrl(code: string): string {
    return `${SITE_URL}/certificates/verify/${code}`;
}

/** Render a one-page certificate PDF with an embedded QR to its verification page. */
export async function renderCertificatePdf(input: {
    holderName: string;
    title: string;
    issuedAt: Date;
    verificationCode: string;
}): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const page = doc.addPage([842, 595]); // A4 landscape, points
    const { width, height } = page.getSize();

    const serif = await doc.embedFont(StandardFonts.TimesRomanBold);
    const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
    const sans = await doc.embedFont(StandardFonts.Helvetica);

    const brand = rgb(0.29, 0.4, 0.25); // matches the site's forest-green brand tone
    const ink = rgb(0.2, 0.2, 0.2);
    const subtle = rgb(0.45, 0.45, 0.45);

    // Border
    page.drawRectangle({
        x: 24, y: 24, width: width - 48, height: height - 48,
        borderColor: brand, borderWidth: 2,
    });

    const centerText = (text: string, y: number, font: typeof serif, size: number, color = ink) => {
        const w = font.widthOfTextAtSize(text, size);
        page.drawText(text, { x: (width - w) / 2, y, size, font, color });
    };

    centerText('SHAKTI YOGA KENDRA', height - 100, serif, 20, brand);
    centerText('Certificate of Achievement', height - 135, serif, 28, ink);
    centerText('This certifies that', height - 190, sans, 13, subtle);
    centerText(input.holderName, height - 230, serif, 26, brand);
    centerText(input.title, height - 270, serifItalic, 16, ink);

    const issued = input.issuedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    centerText(`Issued ${issued}`, height - 305, sans, 11, subtle);

    // QR + verification code, bottom-right
    const qrPng = await QRCode.toBuffer(verificationUrl(input.verificationCode), { type: 'png', width: 160, margin: 1 });
    const qrImage = await doc.embedPng(qrPng);
    const qrSize = 90;
    page.drawImage(qrImage, { x: width - 24 - 40 - qrSize, y: 50, width: qrSize, height: qrSize });
    page.drawText(`Verify: ${input.verificationCode}`, {
        x: width - 24 - 40 - qrSize, y: 40, size: 8, font: sans, color: subtle,
    });

    return doc.save();
}
