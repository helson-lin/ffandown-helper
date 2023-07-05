## fluent-ffmpeg docs

### how to stop or kill download

Send SIGSTOP to suspend ffmpeg: `command.kill('SIGSTOP');`

Send SIGCONT to resume ffmpeg `command.kill('SIGCONT');`

kill ffmeg: `command.kill()`