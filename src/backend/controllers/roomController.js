const sheetsService = require('../services/sheetsService');
const queueService = require('../services/queueService');

const roomController = {
  getRooms(req, res) {
    try {
      const branch = req.query.branch || 'all';
      let rooms = sheetsService.getRooms();
      
      if (branch !== 'all') {
        rooms = rooms.filter(r => r.branch === branch);
      }
      
      res.status(200).json({ success: true, data: rooms });
    } catch (e) {
      console.error('[RoomController] getRooms error:', e.message);
      res.status(500).json({ success: false, message: e.message });
    }
  },

  getRoom(req, res) {
    try {
      const id = req.params.id;
      const room = sheetsService.getRooms().find(r => r.room_id === id);
      
      if (!room) {
        return res.status(404).json({ success: false, message: `Room with ID ${id} not found.` });
      }
      
      res.status(200).json({ success: true, data: room });
    } catch (e) {
      console.error('[RoomController] getRoom error:', e.message);
      res.status(500).json({ success: false, message: e.message });
    }
  },

  createRoom(req, res) {
    try {
      const data = req.body;
      if (!data.room_name || !data.branch) {
        return res.status(400).json({ success: false, message: 'Room name and branch are required.' });
      }

      // Generate room ID in city-branch-index or custom format
      const rooms = sheetsService.getRooms();
      const branch = data.branch || 'cs1';
      let branchName = data.branch_name;
      if (!branchName) {
        if (branch === 'cs1') branchName = 'Chi nhánh Tân Bình (CS1)';
        else if (branch === 'cs2') branchName = 'Chi nhánh Quận 10 (CS2)';
        else if (branch === 'cs3') branchName = 'Chi nhánh Quận 5 (CS3)';
        else if (branch === 'cs4') branchName = 'Chi nhánh Gò Vấp (CS4)';
        else if (branch === 'cs5') branchName = 'Chi nhánh Bình Thạnh (CS5)';
        else branchName = `Chi nhánh ${branch.toUpperCase()}`;
      }

      let newRoomId = data.room_id;
      if (!newRoomId) {
        let prefix = 'XH';
        if (branch === 'cs1') prefix = 'XH';
        else if (branch === 'cs2') prefix = 'BTH';
        else if (branch === 'cs3') prefix = 'PHC';
        else if (branch === 'cs4') prefix = 'CB';
        else if (branch === 'cs5') prefix = 'DT';
        else prefix = branch.substring(0, 3).toUpperCase();

        let maxIndex = 0;
        rooms.forEach(r => {
          if (r.room_id && r.room_id.startsWith(prefix)) {
            const numStr = r.room_id.replace(prefix, '');
            const num = parseInt(numStr, 10);
            if (!isNaN(num) && num > maxIndex) {
              maxIndex = num;
            }
          }
        });
        
        // Match standard indexing (e.g. XH01, BTH101, DT501)
        if (prefix === 'BTH' || prefix === 'CB' || prefix === 'DT') {
          // Three-digit indexing starts at 101, 401, 501
          const startNum = prefix === 'BTH' ? 100 : prefix === 'CB' ? 400 : 500;
          if (maxIndex === 0) {
            newRoomId = prefix + String(startNum + 1);
          } else {
            newRoomId = prefix + String(maxIndex + 1);
          }
        } else {
          // Two-digit indexing
          newRoomId = prefix + String(maxIndex + 1).padStart(2, '0');
        }
      }

      const newRoom = {
        room_id: newRoomId,
        room_name: data.room_name,
        branch: data.branch,
        branch_name: branchName,
        address: data.address || '',
        capacity: Number(data.capacity) || 2,
        base_price_weekday: Number(data.base_price_weekday) || 0,
        base_price_weekend: Number(data.base_price_weekend) || 0,
        slot_prices: typeof data.slot_prices === 'string' ? data.slot_prices : JSON.stringify(data.slot_prices || {}),
        amenities: Array.isArray(data.amenities) ? data.amenities.join(', ') : (data.amenities || ''),
        images: Array.isArray(data.images) ? data.images.join(', ') : (data.images || ''),
        emoji: data.emoji || '🏠',
        description: data.description || '',
        status: data.status || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Optimistic Write
      sheetsService.optimisticCreateRoom(newRoom);
      
      // Enqueue sheets sync task
      queueService.enqueue('CREATE_ROOM', newRoom);

      res.status(201).json({ success: true, data: newRoom });
    } catch (e) {
      console.error('[RoomController] createRoom error:', e.message);
      res.status(500).json({ success: false, message: e.message });
    }
  },

  updateRoom(req, res) {
    try {
      const id = req.params.id;
      const updates = req.body;
      
      const rooms = sheetsService.getRooms();
      const existing = rooms.find(r => r.room_id === id);
      
      if (!existing) {
        return res.status(404).json({ success: false, message: `Room with ID ${id} not found.` });
      }

      const updatedData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      // Optimistic Write
      sheetsService.optimisticUpdateRoom(id, updatedData);
      
      // Enqueue sheets sync task
      queueService.enqueue('UPDATE_ROOM', { id, data: updatedData });

      res.status(200).json({ success: true, data: { ...existing, ...updatedData } });
    } catch (e) {
      console.error('[RoomController] updateRoom error:', e.message);
      res.status(500).json({ success: false, message: e.message });
    }
  },

  deleteRoom(req, res) {
    try {
      const id = req.params.id;
      const force = req.query.force === 'true';

      const rooms = sheetsService.getRooms();
      const existing = rooms.find(r => r.room_id === id);
      
      if (!existing) {
        return res.status(404).json({ success: false, message: `Room with ID ${id} not found.` });
      }

      // Optimistic Write
      sheetsService.optimisticDeleteRoom(id);
      
      // Enqueue sheets sync task
      queueService.enqueue('DELETE_ROOM', { id, force });

      res.status(200).json({ success: true, message: `Room ${id} deleted successfully (soft-deleted).` });
    } catch (e) {
      console.error('[RoomController] deleteRoom error:', e.message);
      res.status(500).json({ success: false, message: e.message });
    }
  }
};

module.exports = roomController;
