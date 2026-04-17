import { io } from 'socket.io-client';
import { BASE_PATH } from './config';
export const socket = io({
    autoConnect: false,
    path: `${BASE_PATH}/socket.io`,
});
