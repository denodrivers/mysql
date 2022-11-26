#!/bin/sh

echo "Waiting for MySQL"
for i in `seq 1 30`;
do
    echo '\q' | mysql -h 127.0.0.1 -uroot --password=root -P 3306 && exit 0
    >&2 echo "MySQL is waking up"
    sleep 1
done

echo "Failed waiting for MySQL" && exit 1
