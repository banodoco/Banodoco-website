FROM python:3.10.2

RUN mkdir banodoco

WORKDIR /banodoco

COPY requirements.txt .

RUN pip3 install --upgrade pip
RUN pip3 install -r requirements.txt

COPY . .

EXPOSE 5500

CMD ["sh", "entrypoint.sh"]