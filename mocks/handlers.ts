import { http, HttpResponse } from 'msw';
import { books } from './books';

export const handlers = [
  http.get('/api/books', () => {
    return HttpResponse.json(books);
  }),
  http.get('/api/books/page', ({ request }) => {
    // Simulate paginated response for test
    const url = new URL(request.url);
    const after = url.searchParams.get('after');
    if (after === 'cursor') {
      return HttpResponse.json({ items: [{ id: '4', title: 'D' }], nextCursor: undefined });
    }
    return HttpResponse.json({ items: [], nextCursor: undefined });
  }),
];
