# 保存视频文件到文件服务

将视频文件保存进数据库，对象数据库采用minio

## 注意事项

1. 上传视频过程会对视频文件进行采样截图，将截图信息作为文件的返回信息并返回给调用者(`key='file.meta.screenshot'`)，该信息为截图文件的id。
1. 如果视频文件编码不是h264，则将其转换为h264文件
1. 有些视频文件如部分(flv)不是mp4格式，但其编码方式为h264,同样可以在浏览器中播放
1. 视频文件的转换比较耗时，鼓励用户直接上传mp4格式文件，不建议在服务器上进行大量转换操作，因其消耗大量cpu资源，将会严重拖慢服务器运行效率。
1. 同样因为转换比较耗时，非mp4格式的文件（确切地讲，视频编码格式非h264的文件）在处理时不作等待即返回给客户端，但该文件仅当转换结束后方可访问。之前不能被访问到，并非上传失败，需谨记此，诱导用户操作时需说明，不要让用户作大量重复上传，同样会拖慢服务器运行效率。

## 返回格式

```ts
{
	id: string;
	contentType: string;
	meta: {
		screenshot: string;
		video:{}
		audio:{}
	},
	md5: string;
	name: string;
}
```

## 配置文件

mm.json

```json
{
	"minio": {
		"endPoint": "127.0.0.1",
		"port": 9000,
		"accessKey": "mmstudio",
		"secretKey": "Mmstudio123",
		"useSSL": false,
		"region": "cn-north-1",
		"partSize": 5242880
	}
}
```

## docker

```yml
version: '3.7'

services:
  minio:
    image: minio/minio
    container_name: minio
    command: server /data
    volumes:
      - /home/taoqf/data/minio:/data
    ports:
      - 9000:9000
    environment:
      MINIO_ACCESS_KEY: mmstudio
      MINIO_SECRET_KEY: Mmstudio123

```
