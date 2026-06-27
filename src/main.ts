import Enquirer from 'enquirer';
import osascript from './osascript';

const e = new Enquirer();

e.on('cancel', () => process.exit(0));

const promptTrack = async (): Promise<string> => {
    const allNames = osascript<string>('get name of every track of library playlist 1 as text');

    const { track } = await e.prompt({
        type: 'autocomplete',
        name: 'track',
        message: 'which track?',
        choices: allNames.split('\n')
    }) as { track: string };

    return track;
}

(async () => {
    const { action } = await e.prompt({
        type: 'autocomplete',
        name: 'action',
        message: 'whatcha wanna do?',
        choices: [
            { name: 'statsByTime', message: 'view top tracks (time sorted)' },
            { name: 'editPlays', message: 'edit track plays' },
            { name: 'editSkips', message: 'edit track skips' },
            { name: 'findOrphans', message: 'find tracks not in any playlist' }
        ]
    }) as { action: 'statsByTime' | 'editPlays' | 'editSkips' | 'findOrphans' };

    if (action === 'editPlays') {
        const track = await promptTrack();

        const { plays } = await e.prompt({
            type: 'input',
            name: 'plays',
            message: `how many plays for ${track}?`
        }) as { plays: string };

        osascript(`set played count of (first track of library playlist 1 whose name is "${track}") to ${plays}`);
    } else if (action === 'editSkips') {
        const track = await promptTrack();

        const { skips } = await e.prompt({
            type: 'input',
            name: 'skips',
            message: `how many skips for ${track}?`
        }) as { skips: string };

        osascript(`set skipped count of (first track of library playlist 1 whose name is "${track}") to ${skips}`);
    } else if (action === 'findOrphans') {
        console.log('finding orphans, this will take a second...');

        const res = osascript<string>(`
            set allTracks to every track of library playlist 1
            set playlistTracks to {}
            repeat with p in (every playlist whose special kind is none)
                set playlistTracks to playlistTracks & (name of every track of p)
            end repeat
            set orphans to {}
            repeat with t in allTracks
                set tName to name of t
                set found to false
                repeat with pName in playlistTracks
                    if pName as text is tName then
                        set found to true
                        exit repeat
                    end if
                end repeat
                if not found then
                    set end of orphans to tName
                end if
            end repeat
            return orphans as text
        `);

        console.log(res);
    } else if (action === 'statsByTime') {
        const res = osascript<string>(`
            set tNames to name of every track of library playlist 1
            set tPlays to played count of every track of library playlist 1
            set tDurations to duration of every track of library playlist 1
            set tArtists to artist of every track of library playlist 1
            set tAlbums to album of every track of library playlist 1
            set output to {}
            repeat with i from 1 to count of tNames
                set end of output to (item i of tNames & "%%%%" & item i of tPlays & "%%%%" & item i of tDurations & "%%%%" & item i of tArtists & "%%%%" & item i of tAlbums)
            end repeat
            return output as text
        `);

        const stats = res.split('\n');

        const statsWithRuntime = stats.map(stat => {
            const [name, plays, duration, artist, album] = stat.split('%%%%');
            const runtime = parseFloat(plays) * parseFloat(duration);
            return { name, plays: Number(plays), duration: Number(duration), runtime, artist, album };
        });

        const fmtRuntime = (s: number) => {
            const h = Math.floor(s / 3600)
            const m = Math.floor((s % 3600) / 60)
            const sec = Math.floor(s % 60)
            return [h && `${h}h`, m && `${m}m`, `${sec}s`].filter(Boolean).join(' ')
        }

        const top = statsWithRuntime.sort((a, b) => b.runtime - a.runtime).slice(0, 20);

        console.table(top.map(s => ({
            Name: s.name,
            Artist: s.artist,
            Plays: s.plays,
            Runtime: fmtRuntime(Math.round(s.runtime))
        })));
    }
})();