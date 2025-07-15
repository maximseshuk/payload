import type { CollectionConfig } from 'payload'

import path from 'path'
import { fileURLToPath } from 'url'

export const mediaSlug = 'media'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const uploadsDir = path.resolve(dirname, '../../media')

export const MediaCollection: CollectionConfig = {
  slug: mediaSlug,
  access: {
    create: () => true,
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
  ],
  upload: {
    staticDir: uploadsDir,
    crop: true,
    focalPoint: true,
    imageSizes: [
      {
        name: 'thumbnail',
        height: 200,
        width: 200,
      },
      {
        name: 'medium',
        height: 800,
        width: 800,
      },
      {
        name: 'large',
        height: 1200,
        width: 1200,
      },
    ],
  },
}
