// PeerJS WebRTC Multiplayer Manager for 2-Player Online Chess

class PeerManager {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.isHost = false;
    this.roomCode = null;
    this.myPeerId = null;
    this.remotePeerId = null;
    this.connected = false;

    // Callbacks
    this.onConnected = () => {};
    this.onDisconnected = () => {};
    this.onMessage = () => {};
    this.onError = () => {};
  }

  // Generate random room code
  generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Initialize Host
  createRoom(roomCode, callbacks = {}) {
    this.isHost = true;
    this.roomCode = (roomCode || this.generateCode()).toUpperCase().trim();
    this.registerCallbacks(callbacks);

    const peerId = `chess-host-${this.roomCode}`;
    this.initPeer(peerId, true);
  }

  // Initialize Guest & Connect to Host
  joinRoom(roomCode, callbacks = {}) {
    this.isHost = false;
    this.roomCode = roomCode.toUpperCase().trim();
    this.registerCallbacks(callbacks);

    const guestId = `chess-guest-${this.roomCode}-${Math.floor(Math.random() * 10000)}`;
    this.initPeer(guestId, false);
  }

  registerCallbacks(cb) {
    if (cb.onConnected) this.onConnected = cb.onConnected;
    if (cb.onDisconnected) this.onDisconnected = cb.onDisconnected;
    if (cb.onMessage) this.onMessage = cb.onMessage;
    if (cb.onError) this.onError = cb.onError;
  }

  initPeer(peerId, isHost) {
    this.destroy();

    // Standard PeerJS public cloud broker (free & reliable WebRTC signaling)
    try {
      this.peer = new Peer(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        }
      });
    } catch (e) {
      console.error('Peer init error:', e);
      this.onError('امکان اتصال به سرور سیگنالینگ PeerJS وجود ندارد. لطفاً اینترنت خود را بررسی کنید.');
      return;
    }

    this.peer.on('open', (id) => {
      this.myPeerId = id;
      console.log('Peer open:', id);

      if (!isHost) {
        // Connect to host
        const targetHostId = `chess-host-${this.roomCode}`;
        this.connectToPeer(targetHostId);
      }
    });

    this.peer.on('connection', (conn) => {
      if (this.isHost) {
        if (this.conn && this.conn.open) {
          // Already have an active guest
          conn.send({ type: 'ROOM_FULL' });
          setTimeout(() => conn.close(), 500);
          return;
        }
        this.setupConnection(conn);
      }
    });

    this.peer.on('error', (err) => {
      console.error('PeerJS error:', err);
      let errMsg = 'خطا در ارتباط شبکه';
      if (err.type === 'peer-unavailable') {
        errMsg = 'اتاقی با این شناسه یافت نشد یا میزبان خارج شده است.';
      } else if (err.type === 'unavailable-id') {
        errMsg = 'این اتاق در حال حاضر توسط شخص دیگری ساخته شده است. لطفاً کد دیگری انتخاب کنید.';
      }
      this.onError(errMsg, err);
    });

    this.peer.on('disconnected', () => {
      console.warn('Peer disconnected from signaling server. Reconnecting...');
      if (this.peer && !this.peer.destroyed) {
        this.peer.reconnect();
      }
    });
  }

  connectToPeer(targetId) {
    const conn = this.peer.connect(targetId, {
      reliable: true
    });
    this.setupConnection(conn);
  }

  setupConnection(conn) {
    this.conn = conn;

    conn.on('open', () => {
      this.connected = true;
      this.remotePeerId = conn.peer;
      console.log('DataConnection established with:', conn.peer);
      this.onConnected({
        isHost: this.isHost,
        remotePeerId: conn.peer,
        roomCode: this.roomCode
      });
    });

    conn.on('data', (data) => {
      this.onMessage(data);
    });

    conn.on('close', () => {
      this.connected = false;
      this.onDisconnected();
    });

    conn.on('error', (err) => {
      console.error('Conn error:', err);
      this.onError('خطا در اتصال بازیکنان', err);
    });
  }

  send(data) {
    if (this.conn && this.conn.open) {
      this.conn.send(data);
      return true;
    }
    return false;
  }

  destroy() {
    this.connected = false;
    if (this.conn) {
      try { this.conn.close(); } catch (e) {}
      this.conn = null;
    }
    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
      this.peer = null;
    }
  }
}

const peerManager = new PeerManager();
