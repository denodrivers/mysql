import { replaceIdentifier } from '../src/util.ts';
import { assertEquals } from '../test.deps.ts';

const { test } = Deno;

test('testIdReplace', function () {
  assertEquals(
    replaceIdentifier(`'??' "??" ?? ?`, ['a', 'b']),
    `'??' "??" \`a\` ?`
  );

  assertEquals(replaceIdentifier('?? ?', null), '?? ?');
  assertEquals(replaceIdentifier('?? ?', []), '?? ?');
  assertEquals(replaceIdentifier('?? ?', [null, null]), '`` ?');

  assertEquals(replaceIdentifier('??', ['user.id']), '`user`.`id`');
  assertEquals(replaceIdentifier('??', ['user.*']), '`user`.*');
  assertEquals(
    replaceIdentifier('??', ['user.id as user_id']),
    '`user`.`id` AS `user_id`'
  );

  assertEquals(replaceIdentifier('?? ?', ['id', 'val']), '`id` ?');
  assertEquals(replaceIdentifier('??', ['id']), '`id`');
  assertEquals(replaceIdentifier('??', [1]), '`1`');
  assertEquals(replaceIdentifier('??', [true]), '`true`');
  assertEquals(replaceIdentifier('?', ['string']), `?`);
  assertEquals(replaceIdentifier('?', [123]), `?`);
  assertEquals(replaceIdentifier('?', [['a', 'b', 'c', 'd']]), '?');
  assertEquals(replaceIdentifier('?', [[1, 2, 3, 4]]), '?');
  assertEquals(replaceIdentifier('??', [['a', 'b', 'c']]), '(`a`,`b`,`c`)');

  let keys: string[] = ['a', 'b', 'c'];
  assertEquals(replaceIdentifier('??', [keys]), '(`a`,`b`,`c`)');
  assertEquals(
    replaceIdentifier('??', [Object.keys({ a: 1, b: 1, c: 1 })]),
    '(`a`,`b`,`c`)'
  );

  const query = replaceIdentifier(
    `select ??, ?? from ?? where ?? = ? and ?? = ? and is_admin = ?`,
    ['name', 'email', 'users', 'id', 1, 'name', 'manyuanrong', true]
  );
  assertEquals(
    query,
    'select `name`, `email` from `users` where `id` = ? and `name` = ? and is_admin = ?'
  );
});
