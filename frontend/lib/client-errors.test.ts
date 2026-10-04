import assert from 'node:assert/strict';
import test from 'node:test';
import { userError } from './client-errors';

test('网络和格式错误转换为中文且提示保留输入', () => {
  assert.match(userError(new TypeError('Failed to fetch')), /已填写内容保留/);
  assert.match(userError(new SyntaxError('Unexpected token')), /保留输入内容/);
  assert.match(userError(new DOMException('timeout', 'TimeoutError')), /请求超时/);
});
test('保留服务端中文提示，不直接展示英文底层错误', () => {
  assert.equal(userError(new Error('文物名称不能为空。')), '文物名称不能为空。');
  assert.match(userError(new Error('disk failure')), /操作未完成/);
});
