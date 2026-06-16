import { execSync } from 'node:child_process';

const osascript = <T>(command: string): T => {
    const script = [
        'tell application "Music"',
        "set AppleScript's text item delimiters to linefeed",
        command,
        'end tell'
    ].join('\n');
    const data = execSync('osascript', { input: script, shell: '/bin/bash' }).toString('utf8').trim();
    return data as T;
};

export default osascript;