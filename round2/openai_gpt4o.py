import asyncio
import openai
import json
import os

# 0 初始化异步 OpenAI 客户端
client = openai.AsyncOpenAI(
    api_key='sk-7d29Eanuuz0bot902014C6100aD**********e604bDfF348',
    base_url='https://api.bltcy.ai/v1/'
)

# 1 保存文件
def save_file(my_list,file_name_index,default_name='./all_solutions_openai/solutions_'):
    folder_name='./all_solutions_openai'
    if not os.path.exists(folder_name):
        os.makedirs(folder_name)
    file_name=default_name+str(file_name_index)+'.json'
    with open(file_name, "w",encoding="utf-8") as file:
        json.dump(my_list, file, ensure_ascii=False, indent=4)


# 2 定义异步任务函数
async def call_openai(prompt):
    print(f"正在处理问题: {prompt}")
    response = await client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="chatgpt-4o-latest",
    )
    return response.choices[0].message.content


# 3 控制每批次的并发执行，最多10个问题
async def rate_limited_batch(prompts, batch_size=5):
    for i in range(0, len(prompts), batch_size):
        # 获取当前批次的 10 个问题
        current_batch = prompts[i:i + batch_size]

        # 执行当前批次的请求
        results = await batch_chat(current_batch)

        # 等待 60 秒，确保每次请求完 10 个问题后再继续
        if i + batch_size < len(prompts):  # 确保在不是最后一批时等待
            # 打印当前批次的结果
            print('当前批次 ' + str(int(i/batch_size)) + ' 结束')
            save_file(results,str(int(i/batch_size)))

            for res in results:
                print(res)

            print("等待 10 秒后，开始下一个批次...")
            await asyncio.sleep(10)  # 每执行完一批后等待 10 秒
            print('-----------------------------------------------------')
        else:
            print('最后一批结束')
            save_file(results, str(int(len(prompts) / batch_size)))

            for res in results:
                print(res)


# 4 批量并发执行请求
async def batch_chat(prompts):
    tasks = [call_openai(prompt) for prompt in prompts]
    return await asyncio.gather(*tasks)



# 5 处理问题
# (1)读取本地 JSON 文件
with open("question_675_shuffled.json", "r", encoding="utf-8") as file:
    source_data = json.load(file)  # 解析 JSON 数据

# (2) 提取 "text" 作为 prompt
prompts = [item["text"] for item in source_data if "text" in item]  #所有的问题

# 3 批量处理所有问题,并送入到本地
asyncio.run(rate_limited_batch(prompts))

############################################################
############################################################
############################################################


# 4 依次读取所有文件,合并为1张表
import re
folder_path='./all_solutions_openai'
json_files = [f for f in os.listdir(folder_path) if f.endswith('.json')]

# 使用自然排序（按数字排序）
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
all_solutions_chatgpt_4o_latest=[]

for i in range(len(merged_data)):
    # 将问题和回答保存在最终的结构中
    all_solutions_chatgpt_4o_latest.append({
        'question': source_data[i],
        'response': merged_data[i]
    })

with open("all_solutions_chatgpt_4o_latest.json", "w", encoding="utf-8") as file:
    json.dump(all_solutions_chatgpt_4o_latest, file, ensure_ascii=False, indent=4)

print("结果已保存为all_solutions_chatgpt_4o_latest.json")
