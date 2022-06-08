# -*- coding: utf-8 -*-
"""
Created on Thu Apr  7 10:01:51 2022

@author: ___hfg__
"""
import math
import matplotlib.pyplot as plt
import datetime
import numpy as np
import scipy.signal

""" Variables pour le calcul de la commande (définition du patient) """

kd=0.85 # [mg/dL/min] terme lié à l'insuline du foie et la consommation de glucides insulino-dépendante
ki=50 # [mg/dL/U] gain statique entre l’insuline injectée et la variation de la glycémie
Ti=60 # [min] durée entre l'injection de l'insuline et son pic
kc=1 # [/dL] gain statique entre les glucides ingérés et la variation de la glycémie 

g_CHO=0 #0 si il n'y a pas de prise de repas (situation basale)
glyc_ref=100 # [mg/dL] glycémie de référence pour le patient

glyc_critique=60 #[mg/dL] glycémie limite de l'hypoglycémie

T_echantillonage=5 # temps d'échantillonage

u_prec=0 #Commande nulle au début de l'activation du code
x2=0
x3=0

#Observateur:
L1=0.0001
L2=0.0001


#Définition plus automatisée du patient à partir de ses données d'insulinothérapie
def definition_patient(Ub,CF,CIR,DIA):
    Ub=0.017
    CF=50
    CIR=500
    DIA=60
    Ub=float(input("Entrez votre débit basal en U/min : \n"))
    CF=float(input("Entrez votre compensatoire en mg/dL/U : \n"))
    CIR=float(input("Entrez votre Carbo-to-Insulino Ratio en g/U : \n"))
    DIA=float(input("Entrez votre Duration of Insulin Activity en minutes : \n"))
    
    
    kd=Ub*CF
    ki=CF
    kc=CF/CIR
    Ti=DIA
    
    return kd,ki,kc,Ti


"""Fonctions de calcul par lois de commande de l'insuline avec les commandes du LS2N"""

def calcul_commande_basal_simple(glyc):
    debit_basal=kd/ki #en unité/minutes, il faudrait multiplier par T_injection : période d'injection de l'insuline par la pompe
    u=debit_basal
    
    if glyc>glyc_ref :
        u += (glyc-glyc_ref)/ki #en unité car ce n'est pas un débit mais un bolus de correction

    if glyc<glyc_critique:
        u=0

    if u<0:
        u=0
    
    return u

def calcul_commande(u_prec,x2,x3,glyc,glyc_prec,g_CHO):
    debit_basal=kd/ki
    u=debit_basal
    x1=debit_basal
    

    if glyc>glyc_ref :
        u += (glyc-glyc_ref)/ki
    print(u)

    if (glyc_prec != -1) and (glyc_prec>glyc_ref):
        x1 += (glyc_prec-glyc_ref)/ki

    x2=abs((1-T_echantillonage/Ti)*x2 + T_echantillonage/Ti*x3 - T_echantillonage*L1*glyc_prec)
    x3=abs((1-T_echantillonage/Ti)*x3 + T_echantillonage/Ti*u_prec - T_echantillonage*L2*glyc_prec)

    u=u+g_CHO/(ki/kc)-(x2+x3)
    

    u_prec=u


    if glyc<glyc_critique:
        u=0

    if u<0:
        u=0
    
    return u,x2,x3


"""Exécution d'une boucle complète (patient virtuel) avec nb échantillonages 
avec affichage de la glycémie et de la commande d'insuline"""

def commande_observateur(nb):
    L=[23.0000,-0.0072,-0.0029]  
    glyc=input("séléctionner la glycémie initiale en mg/dL : ")
    glyc=int(glyc)
    glyc_prec=glyc
    u=0
    u_prec=0
    x2=0
    x3=0
    
    T_echantillonage=0.1
    kc=0.1
    basal=kd/ki
    
    l=[]
    ref=[]
    l_u=[]
    l_g=[]
    
    for i in range(nb):
        l.append(i)
        ref.append(glyc_ref)
        
        u=(glyc-glyc_ref)/ki-kc*(x2+x3)
        
        glyc=glyc_prec-ki*T_echantillonage*x2+kd*T_echantillonage
        print("glycémie: "+str(glyc))
        l_g.append(glyc)
        
        if glyc<glyc_ref:
            u=0
        
        u+=basal
        
        if glyc<glyc_critique:
            u=0
        
        print("commande insuline: "+str(u))
        l_u.append(u)
        
        x2=((1-T_echantillonage/Ti)*x2 + T_echantillonage/Ti*x3 - T_echantillonage*L[1]*glyc_prec)
        if x3==0:
            x2=0
        print("x2: "+str(x2))
        x3=((1-T_echantillonage/Ti)*x3 + T_echantillonage/Ti*u_prec - T_echantillonage*L[2]*glyc_prec)
        print("x3: "+str(x3))
        
        if u<=basal and u_prec<=basal:
            x3=0
        
        u_prec=u
        glyc_prec=glyc
        
    plt.subplot(211)
    plt.plot(l,l_u,label='commande',marker='o')
    for k in range(nb):
        plt.plot([l[k],l[k]], [0,l_u[k]], color='g')
    plt.legend()
    
    plt.subplot(212)
    plt.plot(l,l_g,color='red',label='glycémie')
    plt.plot(l,ref,color='purple',linestyle='dashed',label='cible')
    plt.legend()
    plt.show()
    

"""Modèle à 5 variables d'état (prise en compte des repas avec les glucides)"""

def commande_observateur_glucides(nb):
    #L=[23.0000,-0.0072,-0.0029,2.92*10**(-3),0.35*10**(-3)]
    L=[23.0000,-0.0072,-0.0029,2.92*10**(-3),0.35*10**(-3)]
    glyc=input("séléctionner la glycémie initiale en mg/dL : ")
    glyc=int(glyc)
    glyc_prec=glyc
    u=0
    u_prec=0
    u_g=0
    x2=0
    x3=0
    x4=0
    x5=0
    
    T_echantillonage=0.1
    kc=1
    Tc=0.1
    k_iob=0.1
    basal=kd/ki
    
    l=[]
    ref=[]
    l_u=[]
    l_g=[]
    
    for i in range(nb):
        if i==15:
            u_g=50
        l.append(i)
        ref.append(glyc_ref)
        
        u=(glyc-glyc_ref)/ki-k_iob*(x2+x3)
        
        glyc=glyc_prec-ki*T_echantillonage*x2+kc*T_echantillonage*x4+kd*T_echantillonage
        print("glycémie: "+str(glyc))
        l_g.append(glyc)
        
        if glyc<glyc_ref:
            u=0
        
        u+=basal+u_g/(ki/kc)
        
        if glyc<glyc_critique:
            u=0
        
        x2=((1-T_echantillonage/Ti)*x2 + T_echantillonage/Ti*x3 - T_echantillonage*L[1]*glyc_prec)
        if x3==0:
            x2=0
        print("x2: "+str(x2))
        
        x3=((1-T_echantillonage/Ti)*x3 + T_echantillonage/Ti*u_prec - T_echantillonage*L[2]*glyc_prec)
        if u<=basal and u_prec<=basal:
            x3=0
        print("x3: "+str(x3))
        
        x4=((1-T_echantillonage/Tc)*x4 + T_echantillonage/Tc*x5 - T_echantillonage*L[3]*glyc_prec)
        print("x4: "+str(x4))
        x5=((1-T_echantillonage/Tc)*x5 + T_echantillonage/Tc*u_g - T_echantillonage*L[4]*glyc_prec)
        print("x5: "+str(x5))        
        
        u_prec=u
        glyc_prec=glyc
        u_g=0
        
        if u<0:
            u=0
        print("commande insuline: "+str(u))
        l_u.append(u)
        
    plt.subplot(211)
    plt.plot(l,l_u,label='commande',marker='o')
    for k in range(nb):
        plt.plot([l[k],l[k]], [0,l_u[k]], color='g')
    plt.legend()
    
    plt.subplot(212)
    plt.plot(l,l_g,color='red',label='glycémie')
    plt.plot(l,ref,color='purple',linestyle='dashed',label='cible')
    plt.legend()
    plt.show()
    

"""Cas où le repas n'est pas annoncé"""    
def commande_observateur_glucides_inconnue(nb):
    L=[23.0000,-0.0072,-0.0029,2.92*10**(-3),0.35*10**(-3)]  
    glyc=input("séléctionner la glycémie initiale en mg/dL : ")
    glyc=int(glyc)
    glyc_prec=glyc
    u=0
    u_prec=0
    u_g=0
    x2=0
    x3=0
    x4=0
    x5=0
    
    T_echantillonage=0.1
    kc=0.1
    Tc=0.1
    k_iob=0.1
    basal=kd/ki
    
    l=[]
    ref=[]
    l_u=[]
    l_g=[]
    
    for i in range(nb):
        if i==15:
            u_g=1000
        l.append(i)
        ref.append(glyc_ref)
        
        u=(glyc-glyc_ref)/ki-k_iob*(x2+x3)
        
        glyc=glyc_prec-ki*T_echantillonage*x2+kc*T_echantillonage*x4+kd*T_echantillonage
        print("glycémie: "+str(glyc))
        l_g.append(glyc)
        
        if glyc<glyc_ref:
            u=0
        
        
        if glyc<glyc_critique:
            u=0
        
        x2=((1-T_echantillonage/Ti)*x2 + T_echantillonage/Ti*x3 - T_echantillonage*L[1]*glyc_prec)
        if x3==0:
            x2=0
        print("x2: "+str(x2))
        
        x3=((1-T_echantillonage/Ti)*x3 + T_echantillonage/Ti*u_prec - T_echantillonage*L[2]*glyc_prec)
        if u<=basal and u_prec<=basal:
            x3=0
        print("x3: "+str(x3))
        
        x4=((1-T_echantillonage/Tc)*x4 + T_echantillonage/Tc*x5 - T_echantillonage*L[3]*glyc_prec)
        print("x4: "+str(x4))
        x5=((1-T_echantillonage/Tc)*x5 + T_echantillonage/Tc*u_g - T_echantillonage*L[4]*glyc_prec)
        print("x5: "+str(x5))        
        
        u_prec=u
        glyc_prec=glyc
        u_g=0
        
        if u<0:
            u=0
        print("commande insuline: "+str(u))
        l_u.append(u)
        
    plt.subplot(211)
    plt.plot(l,l_u,label='commande',marker='o')
    for k in range(nb):
        plt.plot([l[k],l[k]], [0,l_u[k]], color='g')
    plt.legend()
    
    plt.subplot(212)
    plt.plot(l,l_g,color='red',label='glycémie')
    plt.plot(l,ref,color='purple',linestyle='dashed',label='cible')
    plt.legend()
    plt.show()
    

"""Fonction de réglage des gains de l'observateur par la méthode d'Ackermann"""

def reglage_gain_observateur(ki,kc,Ti):
    Ts=60
    Tc=10
    A=np.array([[1,-ki*Ts,0,kc*Ts,0],[0,1-Ts/Ti,Ts/Ti,0,0],[0,0,1-Ts/Ti,0,0],[0,0,0,1-Ts/Tc,Ts/Tc],[0,0,0,0,1-Ts/Tc]])
    C=np.array([[1],[0],[0],[0],[0]])
    poles=np.array([-10,-10.001,-10.002,-9.999,-9.998])
    res=scipy.signal.place_poles(np.transpose(A),C, poles, method='YT', rtol=0.001, maxiter=30)
    return res.gain_matrix



"""Commande par PID"""

def commande_pid(nb):
    L=[23.0000,-0.0072,-0.0029,2.92*10**(-3),0.35*10**(-3)] 
    glyc=input("séléctionner la glycémie initiale en mg/dL : ")
    glyc=int(glyc)
    glyc_prec=glyc
    u=0
    u_prec=0
    u_g=0
    x2=0
    x3=0
    x4=0
    x5=0
    
    T_echantillonage=0.1
    kc=0.1
    Tc=0.1
    basal=kd/ki
    
    l=[]
    ref=[]
    l_u=[]
    l_g=[]
    
    gain_critique=5*10**(-19)
    periode_oscillation=25
    k_p=0.6*gain_critique
    k_p=0.001
    tau_i=math.inf
    tau_i=periode_oscillation/2
    tau_d=periode_oscillation/8
    
    
    erreur=0
    sum_erreur=0
    
    for i in range(nb):
        if i==50:
            u_g=0
        l.append(i)
        ref.append(glyc_ref)
        
        
        
        glyc=glyc_prec-ki*T_echantillonage*x2+kc*T_echantillonage*x4+kd*T_echantillonage
        print("glycémie: "+str(glyc))
        l_g.append(glyc)
         
        erreur=glyc-glyc_ref
        sum_erreur+=erreur
        u=basal+k_p*((erreur)+1/tau_i*sum_erreur+tau_d*(glyc-l_g[i-1]))
        
        
        x2=((1-T_echantillonage/Ti)*x2 + T_echantillonage/Ti*x3 - T_echantillonage*L[1]*glyc_prec)
        if x3==0:
            x2=0
        print("x2: "+str(x2))
        
        x3=((1-T_echantillonage/Ti)*x3 + T_echantillonage/Ti*u_prec - T_echantillonage*L[2]*glyc_prec)
        if u<=basal and u_prec<=basal:
            x3=0
        print("x3: "+str(x3))
        
        x4=((1-T_echantillonage/Tc)*x4 + T_echantillonage/Tc*x5 - T_echantillonage*L[3]*glyc_prec)
        print("x4: "+str(x4))
        x5=((1-T_echantillonage/Tc)*x5 + T_echantillonage/Tc*u_g - T_echantillonage*L[4]*glyc_prec)
        print("x5: "+str(x5))        
        
        u_prec=u
        glyc_prec=glyc
        u_g=0
        
        if u<0:
            u=0
        print("commande insuline: "+str(u))
        l_u.append(u)
        
    plt.subplot(211)
    plt.plot(l,l_u,label='commande',marker='o')
    for k in range(nb):
        plt.plot([l[k],l[k]], [0,l_u[k]], color='g')
    plt.legend()
    
    plt.subplot(212)
    plt.plot(l,l_g,color='red',label='glycémie')
    plt.plot(l,ref,color='purple',linestyle='dashed',label='cible')
    plt.legend()
    plt.show()



"""Entrées de simulation proposées dans Android APS"""

def entree_random_aaps():
    min_bg_rand = 70
    max_bg_rand = 190
    
    max_bg_rand = (max_bg_rand+min_bg_rand)/2
    
    date_current = datetime.datetime.now()
    currentMinute = date_current.minute + (date_current.hour % 2) * 60
    bgMgdl = min_bg_rand + (max_bg_rand - min_bg_rand) + (max_bg_rand - min_bg_rand) * np.sin(currentMinute / 120.0 * 2 * np.pi)
    return bgMgdl



def androidaps_random(nb_hour):
    min_bg_rand = 90
    max_bg_rand = 120
    
    min_bg_rand=int(input("séléctionner la glycémie minimale en mg/dL : "))
    max_bg_rand=int(input("séléctionner la glycémie maximale en mg/dL : "))
    
    max_bg_rand = (max_bg_rand+min_bg_rand)/2
    
    
    l1=[]
    l2=[]
    for i in range (nb_hour):
        for k in range (60):
            currentMinute = k + (10+i % 2) * 60
            bgMgdl = min_bg_rand + (max_bg_rand - min_bg_rand) + (max_bg_rand - min_bg_rand) * np.sin(currentMinute / 120.0 * 2 * np.pi)
            l1.append(bgMgdl)
            l2.append(k+i*60)
    
    plt.plot(l2,l1)
    return l1