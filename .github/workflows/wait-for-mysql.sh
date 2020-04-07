#!/bin/sh

echo "Waiting for MySQL"
for i in `seq 1 10`;
do
    result="$(echo '\q' | mysql -h 127.0.0.1 -uroot -P 3306 2>&1 > /dev/null)"
    if [ "$result" = "" ]; then
        echo "Success waiting for MySQL"
        exit 0
    fi
    >&2 echo "MySQL is waking up"
    sleep 10
done

echo "Failded waiting for MySQL" && exit 1
