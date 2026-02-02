# Testing Guide

## Loading the Extension

1. Build the extension:
   ```bash
   pnpm run build
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in top right corner)

4. Click "Load unpacked" and select the `dist` folder

5. The extension should now appear in your extensions list

## What to Test (Current Features)

### ✅ Extension Loads
- [ ] Extension appears in Chrome extensions list
- [ ] No errors in the console (check with F12)
- [ ] Extension icon appears in toolbar

### ✅ Side Panel Opens
- [ ] Click extension icon
- [ ] Side panel opens on the right side
- [ ] "Chat" tab is active by default

### ✅ Navigation Works
- [ ] Click "Settings" tab - should switch to settings page
- [ ] Click "Chat" tab - should switch back to chat page
- [ ] No errors in console during navigation

### ✅ Settings Page Functionality
- [ ] Settings page loads without errors
- [ ] "Loading settings..." appears briefly
- [ ] Default settings appear (OpenAI provider, no API key)
- [ ] Change provider to "Anthropic" - model dropdown updates to Claude models
- [ ] Change provider to "Custom" - Base URL field appears
- [ ] Enter an API key
- [ ] Adjust temperature slider - value updates in label
- [ ] Click "Save Settings"
- [ ] Alert shows "Settings saved successfully!"

### ✅ Settings Persistence
- [ ] Save settings with an API key
- [ ] Close the side panel
- [ ] Reopen the side panel
- [ ] Go to Settings tab
- [ ] Verify settings are still there (API key should show as dots)

### ✅ Settings Validation
- [ ] Try to save without API key - button should be disabled
- [ ] Set provider to "Custom"
- [ ] Enter invalid base URL (e.g., "http://example.com")
- [ ] Click "Save Settings"
- [ ] Error message should appear: "Base URL must use HTTPS protocol"
- [ ] Change to valid HTTPS URL
- [ ] Error should disappear after saving

### ✅ Chat Page (Basic UI)
- [ ] Chat page shows welcome message from assistant
- [ ] Input textarea is visible
- [ ] "Send" button is visible
- [ ] "Summarize Page" button is visible
- [ ] Type a message in textarea
- [ ] Click "Send" or press Enter
- [ ] Message should clear from textarea
- [ ] Check console - should see "Sending message:" log

### ✅ Background Service Worker
- [ ] Go to `chrome://extensions/`
- [ ] Find the extension
- [ ] Click "service worker" link
- [ ] Console should show:
  - "LLM Assistant: Background service worker loaded"
  - No errors

### ✅ Content Script
- [ ] Open any webpage (e.g., google.com)
- [ ] Open DevTools (F12)
- [ ] Check Console
- [ ] Should see: "LLM Assistant: Content script loaded on [URL]"

## Known Limitations (Features Not Yet Implemented)

- ❌ Chat doesn't actually send messages to LLM yet (Step 5-6)
- ❌ "Summarize Page" button doesn't work yet (Step 7-9)
- ❌ No actual LLM API calls happening yet
- ❌ No page content extraction yet
- ❌ No highlighting functionality yet

## Testing Message Passing

To verify message passing works:

1. Open side panel
2. Open DevTools (F12)
3. Go to Console
4. Type in chat input and click Send
5. Check Console for:
   - "Sending message: [your message]"
   - "Background response: {success: true, message: 'PONG from background'}"
   - This confirms side panel ↔ background communication works!

## Debugging Tips

### Extension won't load
- Check that `dist` folder exists
- Run `pnpm run build` again
- Check for errors in terminal

### No extension icon
- Click the puzzle icon in Chrome toolbar
- Pin the extension

### Side panel won't open
- Check `chrome://extensions/` for errors
- Click "service worker" to see background logs
- Look for errors in red

### Settings won't save
- Open DevTools in side panel (right-click → Inspect)
- Check Console for errors
- Verify you entered a valid API key

### Changes not appearing
- After making code changes, run `pnpm run build`
- Go to `chrome://extensions/`
- Click the refresh icon on the extension card
- Reload the extension

## Expected Console Messages

### Side Panel Console:
```
LLM Assistant: Background response: {success: true, ...}
```

### Background Service Worker Console:
```
LLM Assistant: Background service worker loaded
LLM Assistant: Extension installed
Background received message: PING
MessageHandler: Received message PING {...}
```

### Web Page Console:
```
LLM Assistant: Content script loaded on https://example.com
```

## Success Criteria

The test is successful if:
1. ✅ Extension loads without errors
2. ✅ Side panel opens and shows UI
3. ✅ Navigation between Chat/Settings works
4. ✅ Settings can be saved and persisted
5. ✅ No console errors in normal operation
6. ✅ Message passing works (PING/PONG test)

## Next Steps After Testing

If all tests pass, we're ready to implement:
- Step 5: LLM provider integration (OpenAI, Anthropic, Custom)
- Step 6: Real chat functionality with streaming
- Step 7: Page content extraction
- Step 8: Highlighting system
- Step 9: Full summarization workflow
- Step 10: Polish and testing
