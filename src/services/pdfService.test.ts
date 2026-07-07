import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportCardsToPdf } from './pdfService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

vi.mock('jspdf', () => {
  return {
    default: vi.fn().mockImplementation(function() {
      return {
        addFileToVFS: vi.fn(),
        addFont: vi.fn(),
        setFont: vi.fn(),
        setFontSize: vi.fn(),
        setTextColor: vi.fn(),
        setDrawColor: vi.fn(),
        line: vi.fn(),
        text: vi.fn(),
        rect: vi.fn(),
        setFillColor: vi.fn(),
        addPage: vi.fn(),
        save: vi.fn(),
        internal: {
          pageSize: {
            getWidth: vi.fn().mockReturnValue(210),
            getHeight: vi.fn().mockReturnValue(297),
          },
        },
        splitTextToSize: vi.fn().mockReturnValue(['line1', 'line2']),
      };
    }),
  };
});

vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: vi.fn().mockReturnValue('data:image/png;base64,abc'),
  }),
}));

describe('pdfService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exportCardsToPdf calls jspdf methods', async () => {
    const cards = [
      { id: 1, question: 'Q1', answer: 'A1', topic: 'T1', role: 'R1', skillLevel: 'S1' }
    ];
    
    await exportCardsToPdf(cards as any, 'Test Set');
    
    expect(jsPDF).toHaveBeenCalled();
  });
});
