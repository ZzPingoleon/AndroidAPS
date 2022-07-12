clc
clear all
close all

%%
kd=0.85; %0.85
ki=50; %50
kc=1; %1
Ti=60; %60
Ts=1; %1
Tc=30; %30

%%
A=[1 -ki*Ts 0 kc*Ts 0;0 1-Ts/Ti Ts/Ti 0 0;0 0 1-Ts/Ti 0 0;0 0 0 1-Ts/Tc Ts/Tc;0 0 0 0 1-Ts/Tc];
B=[kd*Ts 0 0;0 0 0;0 Ts/Ti 0;0 0 0;0 0 Ts/Tc];
C=[1 0 0 0 0;0 1 0 0 0;0 0 1 0 0];

%Si on n'observe que x1 : 
C=[1 0 0 0 0];

rank(obsv(A,C));

To=10;
Po=[-1/To;-1/To;-1/To;-1/To;-1/To];
L=(acker(A',C',Po))'

%%
%observateur simple:
kd=1.08225;
ki=33.3;
kc=5.6923;
Ti=60;
Tc=10;
Ts=60*5
A=[1 -ki*Ts 0;0 1-Ts/Ti Ts/Ti;0 0 1-Ts/Ti];
B=[kd*Ts 0 ;0 0 ;0 Ts/Ti];
C=[1 0 0];

Po=[-10;-10;-10];
L=(acker(A',C',Po))'

%%
%avec glucides
kd=0.4;
ki=40;
kc=11.42857;
Ti=60;
Ts=60;
Tc=10;
A=[1 -ki*Ts 0 kc*Ts 0;0 1-Ts/Ti Ts/Ti 0 0;0 0 1-Ts/Ti 0 0;0 0 0 1-Ts/Tc Ts/Tc;0 0 0 0 1-Ts/Tc];
B=[kd*Ts 0 0;0 0 0;0 Ts/Ti 0;0 0 0;0 0 Ts/Tc];  
C=[1 0 0 0 0];
D=[0 0 0];

Po=[-10;-10;-10;-10;-10];
L=(acker(A',C',Po))'

%L=[23 -0.0072 -0.0029 0.0029 0.035]'

%% analyse
sys_lqi=ss(A,B,C,D);
step(sys_lqi);
L_lqi=tf(sys_lqi);%Transfert de boucle
nyquist(L_lqi);

%boucles ouvertes:

%entrée naturelle
B1=[kd*Ts;0;0;0;0];
D=0;
sys_1=ss(A,B1,C,D);
L_1=tf(sys_1);%Transfert de boucle
nyquist(L_1);
allmargin(L_1)

%entrée de commande
B2=[0;0;Ts/Ti;0;0];
D=0;
sys_2=ss(A,B2,C,D);
L_2=tf(sys_2);%Transfert de boucle
nyquist(L_2);
allmargin(L_2)

%entrée d'annonce repas
B3=[0;0;0;0;Ts/Tc];
D=0;
sys_3=ss(A,B3,C,D);
L_3=tf(sys_3);%Transfert de boucle
nyquist(L_3);
allmargin(L_3)