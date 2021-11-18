FROM mongo:3.2

COPY db /data/db

# Healthcheck should ensure content is accessible
HEALTHCHECK CMD echo 'db.contents.find({"uri": "contributors"}).count()' |\
    mongo --quiet |\
    grep 1

CMD ["mongod"]
	
