# 单个问题存储
from openai import OpenAI
import json
import os

# 钟程专用
# 0 初始化 Qwen 客户端
client = OpenAI(
    api_key="sk-4360fb70a37d474**********ad593be",
    base_url="https://api.deepseek.com"
)

# 1 保存文件
def save_file(my_list,file_name_index,default_name='./all_solutions_deepseek_675_single/solutions_'):
    folder_name='./all_solutions_deepseek_675_single'
    if not os.path.exists(folder_name):
        os.makedirs(folder_name)

    file_name=default_name+str(int(file_name_index)+440)+'.json'  #从505题目开始，单个题目保存
    with open(file_name, "w",encoding="utf-8") as file:
        json.dump(my_list, file, ensure_ascii=False, indent=4)

# 2 定义调用任务函数
def call_deepseek(question):
    print(f"正在处理问题: {question}")
    response = client.chat.completions.create(
        model="deepseek-reasoner",
        messages=[
            {"role": "user", "content": question},
        ],
    )
    return response.choices[0].message.content



# 3 回答所有问题提
def answer_all_questions(prompts):
    for i in range(0, len(prompts)):
        # 获取当前批次的 10 个问题
        current_batch = prompts[i]

        # 执行当前批次的请求
        results = call_deepseek(current_batch)
        save_file(results,str(int(i)))




# 4 处理问题
# (1)读取本地 JSON 文件
with open("question_675_shuffled.json", "r", encoding="utf-8") as file:
    source_data = json.load(file)  # 解析 JSON 数据

# (2) 提取 "text" 作为 prompt
prompts = [item["text"] for item in source_data if "text" in item]  #所有的问题
prompts_new=prompts[440:]
# prompts_new[0]

# 3 批量处理所有问题,并送入到本地
answer_all_questions(prompts_new)

############################################################
############################################################
############################################################


# 4 依次读取所有文件,合并为1张表
import re
folder_path='./all_solutions_deepseek_675_single'
json_files = [f for f in os.listdir(folder_path) if f.endswith('.json')]

def natural_sort_key(s):
    return [int(text) if text.isdigit() else text for text in re.split(r'(\d+)', s)]

json_files.sort(key=natural_sort_key)

merged_data=[]
for json_file in json_files:
    file_path = os.path.join(folder_path, json_file)
    with open(file_path, 'r', encoding='utf-8') as file:
        data = json.load(file)
        merged_data.extend(data)




# 保存到本地
all_solutions_deepseek671b_singles=[]

for i in range(len(merged_data)):
    # 将问题和回答保存在最终的结构中
    all_solutions_deepseek671b_singles.append({
        'question': source_data[i],
        'response': merged_data[i]
    })

with open("deepseek671B_675_singles.json", "w", encoding="utf-8") as file:
    json.dump(all_solutions_deepseek671b_singles, file, ensure_ascii=False, indent=4)

print("结果已保存为 deepseek671B_675_singles.json")


















