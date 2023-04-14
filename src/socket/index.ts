import { Server, Socket } from "socket.io";

import {
    CONNECTION,
    DISCONNECT,
    WALLETCONNECTED,
    CONTRACTCONNECTED,
    WALLETDISCONNECTED,
    MESSAGES
} from './socketEvents'

/**
 * A class used to create socketio server and send events to connected clients
 */
class SocketServer {
    private static instance: SocketServer;
    private io: Server;

    private constructor() {
        this.io = new Server();
        this.io.on(CONNECTION, (socket: Socket) => {
            console.log('a client connected.', socket.id);

            socket.on(WALLETCONNECTED, (walletAdd) => {
                console.log(`wallet connected - ${walletAdd}`);
                socket.join(walletAdd);
            });

            socket.on(CONTRACTCONNECTED, (contractAdd) => {
                console.log(`contract connected - ${contractAdd}`);
                socket.join(contractAdd);
            });

            socket.on(WALLETDISCONNECTED, socket.leave);

            socket.on(CONTRACTCONNECTED, socket.leave);

            socket.on(DISCONNECT, () => {
                console.log('client disconnected..', socket.id);
            });
        });
    }

    /**
     * Get an instance of socket server
     * @returns
     */
    public static getInstance(): SocketServer {
        if (!SocketServer.instance) {
            SocketServer.instance = new SocketServer();
        }
        return SocketServer.instance;
    }

    /**
     * Send events to connected clients
     * @param data
     * @returns
     */
    public sendEvents(data: any) {
        if (data.walletAddress) this.io.to(data.walletAddress).emit(MESSAGES, JSON.stringify(data));
        if (data.contractAddress) this.io.to(data.contractAddress).emit(MESSAGES, JSON.stringify(data));
    }

    /**
     * Get an io server object
     * @returns
     */
    public getIo(): Server {
        return this.io;
    }
}

export default SocketServer.getInstance();
