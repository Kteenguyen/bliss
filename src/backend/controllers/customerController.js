const sheetsService = require('../services/sheetsService');
const queueService = require('../services/queueService');

const customerController = {
  getCustomers(req, res) {
    try {
      const customers = sheetsService.getCustomers();
      res.status(200).json({ success: true, data: customers });
    } catch (e) {
      console.error('[CustomerController] getCustomers error:', e.message);
      res.status(500).json({ success: false, message: e.message });
    }
  },

  getCustomer(req, res) {
    try {
      const id = req.params.id;
      const customer = sheetsService.getCustomers().find(c => c.customer_id === id);
      
      if (!customer) {
        return res.status(404).json({ success: false, message: `Customer with ID ${id} not found.` });
      }
      
      res.status(200).json({ success: true, data: customer });
    } catch (e) {
      console.error('[CustomerController] getCustomer error:', e.message);
      res.status(500).json({ success: false, message: e.message });
    }
  },

  createCustomer(req, res) {
    try {
      const data = req.body;
      if (!data.customer_name) {
        return res.status(400).json({ success: false, message: 'customer_name is required.' });
      }

      // Generate Customer ID
      const customers = sheetsService.getCustomers();
      let maxId = 0;
      customers.forEach(c => {
        if (c.customer_id && c.customer_id.startsWith('C')) {
          const num = parseInt(c.customer_id.replace('C', ''));
          if (!isNaN(num) && num > maxId) maxId = num;
        }
      });
      const newCustomerId = 'C' + String(maxId + 1).padStart(3, '0');

      const newCustomer = {
        customer_id: newCustomerId,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone || 'N/A',
        facebook_psid: data.facebook_psid || '',
        telegram_chat_id: data.telegram_chat_id || '',
        whatsapp_phone_id: data.whatsapp_phone_id || '',
        interaction_count: Number(data.interaction_count) || 0,
        last_booking_id: data.last_booking_id || '',
        notes: data.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Optimistic cache update
      sheetsService.optimisticCreateCustomer(newCustomer);
      
      // Enqueue to write queue
      queueService.enqueue('CREATE_CUSTOMER', newCustomer);

      res.status(201).json({ success: true, data: newCustomer });
    } catch (e) {
      console.error('[CustomerController] createCustomer error:', e.message);
      res.status(500).json({ success: false, message: e.message });
    }
  },

  updateCustomer(req, res) {
    try {
      const id = req.params.id;
      const updates = req.body;
      
      const customers = sheetsService.getCustomers();
      const existing = customers.find(c => c.customer_id === id);
      
      if (!existing) {
        return res.status(404).json({ success: false, message: `Customer with ID ${id} not found.` });
      }

      const updatedData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      // Optimistic cache update
      sheetsService.optimisticUpdateCustomer(id, updatedData);
      
      // Enqueue write task
      queueService.enqueue('UPDATE_CUSTOMER', { id, data: updatedData });

      res.status(200).json({ success: true, data: { ...existing, ...updatedData } });
    } catch (e) {
      console.error('[CustomerController] updateCustomer error:', e.message);
      res.status(500).json({ success: false, message: e.message });
    }
  }
};

module.exports = customerController;
