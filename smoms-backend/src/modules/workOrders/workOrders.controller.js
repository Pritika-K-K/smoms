import * as woService from './workOrders.service.js';

export const getWorkOrders = async (req, res, next) => {
  try {
    const list = await woService.getAllWorkOrders();
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getWorkOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await woService.getWorkOrderById(id);
    if (!item) return res.status(404).json({ success: false, message: 'Work order not found' });
    return res.status(200).json({ success: true, data: item });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
