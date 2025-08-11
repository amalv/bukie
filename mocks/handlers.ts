import { http, HttpResponse } from 'msw';
import { books } from './books';

export const handlers = [
  http.get('/api/books', () => {
    return HttpResponse.json(books);
  }),
];
