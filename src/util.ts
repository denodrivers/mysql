export function xor(a: Uint8Array, b: Uint8Array): Uint8Array {
  return a.map((byte, index) => {
    return byte ^ b[index];
  });
}

export function replaceIdentifier(
  sql: string,
  params?: any[]
): {
  sql: string;
  params?: any[];
} {
  if (!params) return { sql };
  const valueParams: any[] = [];

  function replace(sql: string, params: any | any[]): string {
    if (!params) return sql;
    let paramIndex = 0;
    sql = sql.replace(/('.*')|(".*")|(\?\?)|(\?)/g, (str) => {
      if (paramIndex >= params.length) return str;
      // ignore
      if (/".*"/g.test(str) || /'.*'/g.test(str)) {
        return str;
      }
      // identifier
      if (str === '??') {
        const val = params[paramIndex++];
        if (val instanceof Array) {
          return `(${val.map((item) => replace('??', [item])).join(',')})`;
        } else if (val === '*') {
          return val;
        } else if (typeof val === 'string' && val.includes('.')) {
          // a.b => `a`.`b`
          const _arr = val.split('.');
          return replace(_arr.map(() => '??').join('.'), _arr);
        } else if (
          typeof val === 'string' &&
          (val.includes(' as ') || val.includes(' AS '))
        ) {
          // a as b => `a` AS `b`
          const newVal = val.replace(' as ', ' AS ');
          const _arr = newVal.split(' AS ');
          return replace(_arr.map(() => '??').join(' AS '), _arr);
        } else {
          return ['`', val, '`'].join('');
        }
      } else {
        // value
        const val = params[paramIndex++];
        if (val instanceof Array) {
          return `(${val.map((item) => replace('?', [item])).join(',')})`;
        } else {
          valueParams.push(val);
          return '?';
        }
      }
    });
    return sql;
  }

  return {
    sql: replace(sql, params),
    params: valueParams,
  };
}
