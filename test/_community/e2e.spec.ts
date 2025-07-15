import type { Page } from '@playwright/test'

import { expect, test } from '@playwright/test'
import fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

import { ensureCompilationIsDone, initPageConsoleErrorCatch, saveDocAndAssert } from '../helpers.js'
import { AdminUrlUtil } from '../helpers/adminUrlUtil.js'
import { initPayloadE2ENoConfig } from '../helpers/initPayloadE2ENoConfig.js'
import { TEST_TIMEOUT_LONG } from '../playwright.config.js'
import { mediaSlug } from './collections/Media/index.js'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

test.describe('Community', () => {
  let page: Page
  let url: AdminUrlUtil

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(TEST_TIMEOUT_LONG)

    const { serverURL } = await initPayloadE2ENoConfig({ dirname })
    url = new AdminUrlUtil(serverURL, mediaSlug)

    const context = await browser.newContext()
    page = await context.newPage()
    initPageConsoleErrorCatch(page)
    await ensureCompilationIsDone({ page, serverURL })
  })

  test('should not rewrite file when updating collection fields', async () => {
    // Navigate to media creation page
    await page.goto(url.create)

    // Upload file
    await page.setInputFiles('input[type="file"]', path.resolve(dirname, './test-image.jpg'))

    const filenameField = page.locator('.file-field__filename')
    await expect(filenameField).toHaveValue('test-image.jpg')

    // Save document
    await saveDocAndAssert(page)

    const fileUrlElement = page.locator('.file-meta__url a')
    await expect(fileUrlElement).toBeVisible()

    const fileUrl = await fileUrlElement.getAttribute('href')
    const uploadedFileName = fileUrl!.split('/').pop()!

    const uploadsDir = path.resolve(dirname, './media')
    const uploadedFilePath = path.join(uploadsDir, uploadedFileName)

    console.log('Uploaded file:', uploadedFileName)
    console.log('Full path:', uploadedFilePath)

    // Get file stats after upload
    const initialStats = fs.statSync(uploadedFilePath)
    const initialMtime = initialStats.mtime
    const initialCtime = initialStats.ctime
    const initialSize = initialStats.size

    console.log('Initial file stats:', {
      mtime: initialMtime,
      ctime: initialCtime,
      size: initialSize,
      fileName: uploadedFileName,
    })

    // Reload page to ensure clean state
    await page.reload()

    // Update only collection fields (alt field)
    const altField = page.locator('#field-alt')
    await altField.fill('Updated alt text for bug reproduction')

    // Save changes
    await saveDocAndAssert(page)

    // BUG: File is being physically rewritten when only updating custom fields

    // Get file stats after update
    const updatedStats = fs.statSync(uploadedFilePath)
    const updatedMtime = updatedStats.mtime
    const updatedCtime = updatedStats.ctime
    const updatedSize = updatedStats.size

    console.log('Updated file stats:', {
      mtime: updatedMtime,
      ctime: updatedCtime,
      size: updatedSize,
      fileName: uploadedFileName,
    })

    console.log('File changes comparison:', {
      mtimeChanged: updatedMtime.getTime() !== initialMtime.getTime(),
      ctimeChanged: updatedCtime.getTime() !== initialCtime.getTime(),
      sizeChanged: updatedSize !== initialSize,
      mtimeDiff: updatedMtime.getTime() - initialMtime.getTime(),
      ctimeDiff: updatedCtime.getTime() - initialCtime.getTime(),
    })

    // eslint-disable-next-line payload/no-flaky-assertions
    expect(updatedMtime.getTime()).toBe(initialMtime.getTime()) // Modification time should not change
    // eslint-disable-next-line payload/no-flaky-assertions
    expect(updatedSize).toBe(initialSize) // File size should not change

    // Verify metadata update was successful
    await expect(altField).toHaveValue('Updated alt text for bug reproduction')
  })
})
