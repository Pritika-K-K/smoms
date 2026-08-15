import { getReportAnalytics, generateTicketsCSV } from './reports.service.js';

export const handleGetAnalytics = async (req, res, next) => {
  try {
    const data = await getReportAnalytics();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const handleExportCSV = async (req, res, next) => {
  try {
    const csvContent = await generateTicketsCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="smoms_tickets_report.csv"');
    return res.status(200).send(csvContent);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
