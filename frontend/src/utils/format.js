export const shortId = (id) =>
  id ? `${id.substring(0, 4)}...${id.substring(id.length - 4)}` : '';

export const fmtDistance = (dist) =>
  dist === 0 || typeof dist === 'number' ? dist.toFixed(3) : '';
