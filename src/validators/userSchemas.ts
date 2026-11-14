import { z } from 'zod';

export const getUserChats = {
  params: z.object({
    userId: z.string().min(1),
  }),
};

