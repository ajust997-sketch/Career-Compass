"""Optional test-only Redis/Lua process. Never used by the deployed application."""
import json
import sys
import fakeredis

db = fakeredis.FakeRedis(decode_responses=True)
for line in sys.stdin:
    try:
        command = json.loads(line)
        result = db.execute_command(*command)
        if command[0] == 'PING' and result is True:
            result = 'PONG'
        print(json.dumps({'result': result}), flush=True)
    except Exception as exc:
        print(json.dumps({'error': str(exc)}), flush=True)
