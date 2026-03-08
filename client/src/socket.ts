import { io } from 'socket.io-client';

export const socket = io({
  autoConnect: false,
  path: '/pokemonparty/socket.io',
});
