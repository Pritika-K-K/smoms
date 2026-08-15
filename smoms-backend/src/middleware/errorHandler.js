export const errorHandler = (err, req, res, next) => {
  console.error('[SMOMS API Error]:', err?.message || err);
  
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let userMessage = err.message || 'Internal Server Error';

  // Sanitize internal Prisma & MongoDB Atlas network timeout errors
  if (
    userMessage.includes('Invalid `prisma.') ||
    userMessage.includes('Server selection timeout') ||
    userMessage.includes('os error 10060') ||
    userMessage.includes('ReplicaSetNoPrimary')
  ) {
    userMessage = 'Database connection timeout. Please check MongoDB Atlas network access / internet connection and try again.';
  }

  res.status(statusCode).json({
    success: false,
    message: userMessage,
  });
};
