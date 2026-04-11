import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  async exportData(format: 'json' | 'csv') {
    const volunteers = await this.prisma.volunteer.findMany();
    const reviews = await this.prisma.review.findMany();
    const auditLogs = await this.prisma.auditLog.findMany();

    // Serialize BigInt for JSON/CSV stringification
    const serializeParams = (data: any[]) =>
      data.map((item) => {
        const cloned = { ...item };
        for (const key in cloned) {
          if (typeof cloned[key] === 'bigint') {
            cloned[key] = cloned[key].toString();
          }
        }
        return cloned;
      });

    const data = {
      volunteers: serializeParams(volunteers),
      reviews: serializeParams(reviews),
      auditLogs: serializeParams(auditLogs),
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      // Basic CSV Generation
      const toCsv = (arr: any[]) => {
        if (!arr || arr.length === 0) return '';
        const headers = Object.keys(arr[0]).join(',');
        const rows = arr.map((item) =>
          Object.values(item)
            .map((val) => `"${String(val).replace(/"/g, '""')}"`)
            .join(','),
        );
        return [headers, ...rows].join('\n');
      };

      return (
        '--- VOLUNTEERS ---\n' +
        toCsv(data.volunteers) +
        '\n\n--- REVIEWS ---\n' +
        toCsv(data.reviews) +
        '\n\n--- AUDIT LOGS ---\n' +
        toCsv(data.auditLogs)
      );
    }
  }
}
