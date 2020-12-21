import { IncomingMessage } from 'http';
import { promises as fs } from 'fs';
import { basename, dirname, extname, join } from 'path';
import anylogger from 'anylogger';
import ffprobe from 'ffprobe';
import ffprobe_static from 'ffprobe-static';
import an8 from '@mmstudio/an000008';
import exec from '@mmstudio/an000040';
import parsefiles from '@mmstudio/an000041';
import up from '@mmstudio/an000043';

const logger = anylogger('@mmstudio/an000044');

export default async function upload(req: IncomingMessage, screenshottime: number) {
	logger.debug('start uploading files');
	const files = await parsefiles(req);
	logger.debug('files:', files);
	const type = 'video/mp4';
	const uploaded = Promise.all(files.map(async (file) => {
		// 进行视频截图
		const dir = dirname(file.path);
		const ext = extname(file.path);
		const tempfilename = basename(file.path, ext);
		const filename = basename(file.name);
		const tempimg = join(dir, `${tempfilename}.jpg`);
		await screenshot(file.path, tempimg, screenshottime);
		const [uploaded_image] = await up([{
			name: `${filename}.jpg`,
			path: tempimg,
			type: 'image/jpeg',
			meta: {}
		}]);
		const [video, audio] = await get_stream_info(file.path);
		// !!! 如果上传的格式不是mp4格式，这里返回的值是原文件的多媒体信息
		const vfile = {
			...file,
			meta: { screenshot: uploaded_image.id, video, audio, duration: video.duration || 0 }
		};
		logger.debug('codec', video.codec_name);
		if (video.codec_name === 'h264') {
			if (file.type !== type) {
				file.type = type;
			}
			const ret = (await up([vfile]))[0];
			ret.meta.screenshot = uploaded_image.id;
			return ret;
		}
		// 如果不是mp4,进行转换,转换过程比较费时，直接返回给用户，转换过程在后台慢慢进行
		// do not wait convertion, just return file id, the video could not be download before convertion.
		const mp4_path = join(dir, `${tempfilename}.mp4`);
		const name = `${filename}.mp4`;
		const id = an8();
		void (async (file) => {
			await converttomp4(file.path, mp4_path);
			void fs.unlink(file.path);
			const [video, audio] = await get_stream_info(mp4_path);
			const meta = { ...vfile.meta, video, audio, duration: video.duration };
			await up([{
				meta,
				id,
				name,
				path: mp4_path,
				type
			}]);
			logger.info(`File is converted: id=${id}, name=${file.name}`);
		})(file);
		return {
			id,
			contentType: type,
			meta: {
				screenshot: uploaded_image.id,
				video,
				audio
			},
			md5: '',
			name
		};
	}));
	logger.info('upload all!');
	return uploaded;
}

function converttomp4(src: string, dest: string) {
	// apt install ffmpeg libx264-155
	return exec(`ffmpeg -i ${src} -vcodec h264 ${dest}
`);
}

function screenshot(src: string, dest: string, offset: number) {
	// apt install ffmpeg libx264-155
	// 单位：秒
	return exec(`ffmpeg -i ${src} -ss ${offset} -vframes 1 ${dest}
`);
}

async function get_stream_info(path: string) {
	const info = await ffprobe(path, { path: ffprobe_static.path });
	return info.streams;
	// apt install ffprobe
	// // return exec(`ffprobe -show_streams -print_format json ${path}`);
	// return spawn('ffprobe', ['-show_data', '-show_streams', '-print_format', 'json', path]);
}
